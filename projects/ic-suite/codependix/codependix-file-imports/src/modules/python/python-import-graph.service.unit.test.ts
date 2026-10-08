import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { PythonImportGraphService } from "./python-import-graph.service";
import { PythonImportParserService } from "./python-import-parser.service";
import { PythonProjectService } from "./python-project.service";
import { PYTHON_IMPORT_GRAPH_UNCONNECTED } from "./python.constants";

import type { PythonProject } from "./python.types";

/** Writes a project holding the given files under a fresh temp directory. */
async function buildProject(
  files: Record<string, string>,
): Promise<PythonProject> {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "codependix-imports-python-"),
  );

  for (const [name, text] of Object.entries(files)) {
    await mkdir(path.join(workspaceRoot, path.dirname(name)), {
      recursive: true,
    });
    await writeFile(path.join(workspaceRoot, name), text, "utf8");
  }

  return { absoluteRoot: workspaceRoot, name: "example" };
}

describe(PythonImportGraphService, () => {
  let service: PythonImportGraphService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PythonImportGraphService,
        PythonImportParserService,
        PythonProjectService,
      ],
    }).compile();

    service = await module.resolve(PythonImportGraphService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("resolves an absolute from-import to its owned source file", async () => {
    const project = await buildProject({
      "src/__init__.py": "",
      "src/grammars.py": "class Grammar:\n    pass\n",
      "src/models.py": "from src.grammars import Grammar\n",
    });

    const graph = service.buildGraph(project);

    expect(graph.edges).toContainEqual({
      source: "src/models.py",
      target: "src/grammars.py",
    });
  });

  it("resolves a dotted plain import to its owned source file", async () => {
    const project = await buildProject({
      "src/__init__.py": "",
      "src/output.py": "def render() -> None:\n    pass\n",
      "testing/test_output.py": "import src.output as output_module\n",
    });

    const graph = service.buildGraph(project);

    expect(graph.edges).toContainEqual({
      source: "testing/test_output.py",
      target: "src/output.py",
    });
  });

  it("resolves a relative import to a package's __init__.py", async () => {
    const project = await buildProject({
      "src/__init__.py": "VALUE = 1\n",
      "src/helper.py": "from . import VALUE\n",
    });

    const graph = service.buildGraph(project);

    expect(graph.edges).toContainEqual({
      source: "src/helper.py",
      target: "src/__init__.py",
    });
  });

  it("resolves a two-dot relative import by ascending an extra directory", async () => {
    const project = await buildProject({
      "src/__init__.py": "TOP_LEVEL = 1\n",
      "src/package/__init__.py": "",
      "src/package/module.py": "from .. import TOP_LEVEL\n",
    });

    const graph = service.buildGraph(project);

    expect(graph.edges).toContainEqual({
      source: "src/package/module.py",
      target: "src/__init__.py",
    });
  });

  it("lists every project file, including ones with no import edges", async () => {
    const project = await buildProject({
      "src/grammars.py": "class Grammar:\n    pass\n",
      "src/models.py": "from src.grammars import Grammar\n",
    });

    const graph = service.buildGraph(project);

    expect(graph.fileNames).toStrictEqual(["src/grammars.py", "src/models.py"]);
  });

  it("excludes an import that resolves to a file outside project discovery", async () => {
    const project = await buildProject({
      "src/__pycache__/helper.py": "VALUE = 1\n",
      "src/index.py": "from src.__pycache__.helper import VALUE\n",
    });

    const graph = service.buildGraph(project);

    expect(graph.edges).toStrictEqual([]);
  });

  it("excludes an import of an external package", async () => {
    const project = await buildProject({
      "src/models.py": "from pydantic import BaseModel\n",
    });

    const graph = service.buildGraph(project);

    expect(graph.edges).toStrictEqual([]);
  });

  it("reports a file with no edges as isolated", async () => {
    const project = await buildProject({
      "src/models.py": "from pydantic import BaseModel\n",
      "src/unrelated.py": "VALUE = 1\n",
    });

    const graph = service.buildGraph(project);

    expect(graph.isolatedFileNames).toStrictEqual([
      "src/models.py",
      "src/unrelated.py",
    ]);
  });

  it("excludes a file importing itself", async () => {
    const project = await buildProject({
      "src/models.py": "import src.models\n",
    });

    const graph = service.buildGraph(project);

    expect(graph.edges).toStrictEqual([]);
  });

  it("sorts edges by source then target", async () => {
    const project = await buildProject({
      "src/a.py": "A = 1\n",
      "src/b.py": "B = 1\n",
      "src/index.py": "from src.a import A\nfrom src.b import B\n",
    });

    const graph = service.buildGraph(project);

    expect(graph.edges).toStrictEqual([
      { source: "src/index.py", target: "src/a.py" },
      { source: "src/index.py", target: "src/b.py" },
    ]);
  });

  it("collapses duplicate edges declared through separate import statements", async () => {
    const project = await buildProject({
      "src/helper.py": "VALUE = 1\n",
      "src/index.py":
        "from src.helper import VALUE\nfrom src.helper import VALUE\n",
    });

    const graph = service.buildGraph(project);

    expect(graph.edges).toStrictEqual([
      { source: "src/index.py", target: "src/helper.py" },
    ]);
  });

  describe("renderMermaid", () => {
    it("renders the unconnected message for a graph with no edges", () => {
      expect(
        service.renderMermaid({
          edges: [],
          fileNames: ["src/index.py"],
          isolatedFileNames: ["src/index.py"],
          projectName: "example",
        }),
      ).toBe(PYTHON_IMPORT_GRAPH_UNCONNECTED);
    });

    it("renders a fenced mermaid diagram for a graph with edges", () => {
      const rendered = service.renderMermaid({
        edges: [{ source: "src/index.py", target: "src/helper.py" }],
        fileNames: ["src/helper.py", "src/index.py"],
        isolatedFileNames: [],
        projectName: "example",
      });

      expect(rendered).toBe(
        [
          "```mermaid",
          "graph LR",
          '  file_src_helper_py["src/helper.py"]',
          '  file_src_index_py["src/index.py"]',
          "  file_src_index_py --> file_src_helper_py",
          "```",
        ].join("\n"),
      );
    });
  });
});
