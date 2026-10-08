import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { buildFixtureProgram } from "../../../testing/programs";

import { TypescriptImportGraphService } from "./typescript-import-graph.service";
import { TypescriptProjectService } from "./typescript-project.service";
import { TYPESCRIPT_IMPORT_GRAPH_UNCONNECTED } from "./typescript.constants";

/** Builds a graph from in-memory files, through a real fixture program. */
function buildGraph(
  files: Record<string, string>,
): ReturnType<TypescriptImportGraphService["buildGraph"]> {
  const service = new TypescriptImportGraphService(
    new TypescriptProjectService(),
  );

  return service.buildGraph(buildFixtureProgram(files));
}

describe(TypescriptImportGraphService, () => {
  let service: TypescriptImportGraphService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [TypescriptImportGraphService, TypescriptProjectService],
    }).compile();

    service = await module.resolve(TypescriptImportGraphService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("resolves a relative .js-extension import to its real .ts source file", () => {
    const graph = buildGraph({
      "package.json": '{"type":"module"}',
      "src/helper.ts": "export function helper(): void {}\n",
      "src/index.ts": 'import { helper } from "./helper.js";\nhelper();\n',
    });

    expect(graph.edges).toContainEqual({
      source: "src/index.ts",
      target: "src/helper.ts",
    });
  });

  it("lists every project file, including ones with no import edges", () => {
    const graph = buildGraph({
      "package.json": '{"type":"module"}',
      "src/helper.ts": "export function helper(): void {}\n",
      "src/index.ts": 'import { helper } from "./helper.js";\nhelper();\n',
    });

    expect(graph.fileNames).toStrictEqual(["src/helper.ts", "src/index.ts"]);
  });

  it("excludes an import of an external package", () => {
    const graph = buildGraph({
      "package.json": '{"type":"module"}',
      "src/index.ts": 'import { z } from "zod";\nz.string();\n',
    });

    expect(graph.edges).toStrictEqual([]);
  });

  it("reports a file with no edges as isolated", () => {
    const graph = buildGraph({
      "package.json": '{"type":"module"}',
      "src/index.ts": 'import { z } from "zod";\nz.string();\n',
      "src/unrelated.ts": "export const value = 1;\n",
    });

    expect(graph.isolatedFileNames).toStrictEqual([
      "src/index.ts",
      "src/unrelated.ts",
    ]);
  });

  it("excludes an import that resolves outside the project's own files", () => {
    const graph = buildGraph({
      "node_modules/foo/index.ts": "export const foo = 1;\n",
      "node_modules/foo/package.json": '{"main":"index.js","type":"module"}',
      "package.json": '{"type":"module"}',
      "src/index.ts": 'import { foo } from "foo";\nfoo;\n',
    });

    expect(graph.edges).toStrictEqual([]);
  });

  it("excludes a file importing itself", () => {
    const graph = buildGraph({
      "package.json": '{"type":"module"}',
      "src/index.ts": 'import "./index.js";\nexport const value = 1;\n',
    });

    expect(graph.edges).toStrictEqual([]);
  });

  it("sorts edges by source then target", () => {
    const graph = buildGraph({
      "package.json": '{"type":"module"}',
      "src/a.ts": "export const a = 1;\n",
      "src/b.ts": "export const b = 1;\n",
      "src/index.ts":
        'import { a } from "./a.js";\nimport { b } from "./b.js";\na;\nb;\n',
    });

    expect(graph.edges).toStrictEqual([
      { source: "src/index.ts", target: "src/a.ts" },
      { source: "src/index.ts", target: "src/b.ts" },
    ]);
  });

  it("collapses duplicate edges declared through separate import statements", () => {
    const graph = buildGraph({
      "package.json": '{"type":"module"}',
      "src/helper.ts":
        "export function helper(): void {}\nexport type Helper = () => void;\n",
      "src/index.ts":
        'import { helper } from "./helper.js";\nimport type { Helper } from "./helper.js";\nhelper();\nexport type { Helper };\n',
    });

    expect(
      graph.edges.filter(
        (edge) =>
          edge.source === "src/index.ts" && edge.target === "src/helper.ts",
      ),
    ).toHaveLength(1);
  });

  it("renders the unconnected message when a project has no internal imports", () => {
    const graph = buildGraph({
      "package.json": '{"type":"module"}',
      "src/index.ts": "export const value = 1;\n",
    });

    expect(service.renderMermaid(graph)).toBe(
      TYPESCRIPT_IMPORT_GRAPH_UNCONNECTED,
    );
  });

  it("renders a fenced mermaid diagram with every file and edge", () => {
    const graph = buildGraph({
      "package.json": '{"type":"module"}',
      "src/helper.ts": "export function helper(): void {}\n",
      "src/index.ts": 'import { helper } from "./helper.js";\nhelper();\n',
    });
    const mermaid = service.renderMermaid(graph);

    expect(mermaid).toContain("```mermaid");
    expect(mermaid).toContain("graph LR");
    expect(mermaid).toContain('["src/index.ts"]');
    expect(mermaid).toContain('["src/helper.ts"]');
    expect(mermaid).toContain("-->");
  });
});
