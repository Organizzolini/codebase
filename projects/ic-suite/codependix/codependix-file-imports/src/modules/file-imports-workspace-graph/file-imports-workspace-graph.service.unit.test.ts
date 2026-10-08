import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { FileImportsWorkspaceGraphService } from "./file-imports-workspace-graph.service";

import type { PythonImportGraph } from "../python/python.types";
import type { TypescriptImportGraph } from "../typescript/typescript.types";

describe(FileImportsWorkspaceGraphService, () => {
  let service: FileImportsWorkspaceGraphService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [FileImportsWorkspaceGraphService],
    }).compile();

    service = await module.resolve(FileImportsWorkspaceGraphService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("buildWorkspaceGraph", () => {
    it("qualifies every file name with the project it belongs to", () => {
      const typescriptGraph: TypescriptImportGraph = {
        edges: [],
        fileNames: ["src/index.ts"],
        isolatedFileNames: ["src/index.ts"],
        projectName: "logger",
      };

      const workspaceGraph = service.buildWorkspaceGraph({
        pythonGraphs: [],
        typescriptGraphs: [typescriptGraph],
      });

      expect(workspaceGraph.fileNames).toStrictEqual(["logger/src/index.ts"]);
    });

    it("combines edges from both languages into one graph", () => {
      const typescriptGraph: TypescriptImportGraph = {
        edges: [{ source: "src/index.ts", target: "src/helper.ts" }],
        fileNames: ["src/helper.ts", "src/index.ts"],
        isolatedFileNames: [],
        projectName: "logger",
      };
      const pythonGraph: PythonImportGraph = {
        edges: [{ source: "main.py", target: "utilities.py" }],
        fileNames: ["main.py", "utilities.py"],
        isolatedFileNames: [],
        projectName: "affirmancy",
      };

      const workspaceGraph = service.buildWorkspaceGraph({
        pythonGraphs: [pythonGraph],
        typescriptGraphs: [typescriptGraph],
      });

      expect(workspaceGraph.edges).toStrictEqual([
        { source: "affirmancy/main.py", target: "affirmancy/utilities.py" },
        { source: "logger/src/index.ts", target: "logger/src/helper.ts" },
      ]);
    });

    it("keeps two same-named files in two different projects apart", () => {
      const first: TypescriptImportGraph = {
        edges: [],
        fileNames: ["src/index.ts"],
        isolatedFileNames: ["src/index.ts"],
        projectName: "logger",
      };
      const second: TypescriptImportGraph = {
        edges: [],
        fileNames: ["src/index.ts"],
        isolatedFileNames: ["src/index.ts"],
        projectName: "codebase",
      };

      const workspaceGraph = service.buildWorkspaceGraph({
        pythonGraphs: [],
        typescriptGraphs: [first, second],
      });

      expect(workspaceGraph.fileNames).toStrictEqual([
        "codebase/src/index.ts",
        "logger/src/index.ts",
      ]);
    });

    it("sorts file names and edges so the diagram never churns", () => {
      const graphs: TypescriptImportGraph[] = [
        {
          edges: [{ source: "b.ts", target: "a.ts" }],
          fileNames: ["b.ts", "a.ts"],
          isolatedFileNames: [],
          projectName: "zebra",
        },
        {
          edges: [{ source: "y.ts", target: "x.ts" }],
          fileNames: ["y.ts", "x.ts"],
          isolatedFileNames: [],
          projectName: "alpha",
        },
      ];

      const workspaceGraph = service.buildWorkspaceGraph({
        pythonGraphs: [],
        typescriptGraphs: graphs,
      });

      expect(workspaceGraph.fileNames).toStrictEqual([
        "alpha/x.ts",
        "alpha/y.ts",
        "zebra/a.ts",
        "zebra/b.ts",
      ]);
      expect(workspaceGraph.edges).toStrictEqual([
        { source: "alpha/y.ts", target: "alpha/x.ts" },
        { source: "zebra/b.ts", target: "zebra/a.ts" },
      ]);
    });
  });

  describe("renderMermaid", () => {
    it("renders every qualified file and edge in the workspace", () => {
      const typescriptGraph: TypescriptImportGraph = {
        edges: [{ source: "src/index.ts", target: "src/helper.ts" }],
        fileNames: ["src/helper.ts", "src/index.ts"],
        isolatedFileNames: [],
        projectName: "logger",
      };

      const workspaceGraph = service.buildWorkspaceGraph({
        pythonGraphs: [],
        typescriptGraphs: [typescriptGraph],
      });

      expect(service.renderMermaid(workspaceGraph)).toBe(
        [
          "```mermaid",
          "graph LR",
          '  file_logger_src_helper_ts["logger/src/helper.ts"]',
          '  file_logger_src_index_ts["logger/src/index.ts"]',
          "  file_logger_src_index_ts --> file_logger_src_helper_ts",
          "```",
        ].join("\n"),
      );
    });

    it("states in words that the workspace has no internal file imports", () => {
      const workspaceGraph = service.buildWorkspaceGraph({
        pythonGraphs: [],
        typescriptGraphs: [],
      });

      expect(service.renderMermaid(workspaceGraph)).toBe(
        "_This workspace has no internal file imports, in any project._",
      );
    });
  });
});
