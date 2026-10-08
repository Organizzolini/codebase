import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { JsonService } from "../json/json.service";
import { MarkdownService } from "../markdown/markdown.service";
import { EMPTY_PYTHON_RESULT } from "../python/python.constants";
import { PythonService } from "../python/python.service";

import { JupyterService } from "./jupyter.service";

import type { DeepMocked } from "@golevelup/ts-vitest";
import type * as NodeFileSystem from "node:fs";

// Reads stay real except for one sentinel path, which throws a bare string:
// a rejected promise or a thrown literal is not an Error, and the analyzer
// still has to report which file it gave up on.
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof NodeFileSystem>();

  return {
    ...actual,
    readFileSync: (filePath: string, encoding: "utf8") => {
      if (filePath.endsWith("throws-a-string.ipynb")) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw "not an Error";
      }

      return actual.readFileSync(filePath, encoding);
    },
  };
});

/** A notebook holding one markdown cell and one executed code cell. */
const sampleNotebook = {
  cells: [
    {
      cell_type: "markdown",
      source: ["# Title\n", "\n", "Some [prose](https://example.com).\n"],
    },
    {
      cell_type: "code",
      execution_count: 3,
      outputs: [{ output_type: "stream" }, { output_type: "display_data" }],
      source: ["import math\n", "\n", "def area(radius):\n", "    return 1\n"],
    },
    { cell_type: "raw", source: "untouched\n" },
  ],
  metadata: {},
  nbformat: 4,
  nbformat_minor: 5,
};

describe(JupyterService, () => {
  let service: JupyterService;
  let jsonService: JsonService;
  let markdownService: MarkdownService;
  let pythonService: PythonService;
  let loggerService: DeepMocked<LoggerService>;
  const temporaryDirectories: string[] = [];

  /** Writes notebooks into a fresh directory and returns it with their names. */
  function writeNotebooks(notebooks: Record<string, unknown>): {
    notebookFiles: string[];
    workingDirectory: string;
  } {
    const workingDirectory = mkdtempSync(path.join(tmpdir(), "codometer-nb-"));
    temporaryDirectories.push(workingDirectory);

    for (const [fileName, notebook] of Object.entries(notebooks)) {
      writeFileSync(
        path.join(workingDirectory, fileName),
        typeof notebook === "string" ? notebook : JSON.stringify(notebook),
        "utf8",
      );
    }

    return { notebookFiles: Object.keys(notebooks), workingDirectory };
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        JupyterService,
        JsonService,
        MarkdownService,
        PythonService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    service = await module.resolve(JupyterService);
    jsonService = await module.resolve(JsonService);
    markdownService = await module.resolve(MarkdownService);
    pythonService = await module.resolve(PythonService);
    loggerService = await module.resolve(LoggerService);
  });

  afterEach(() => {
    vi.restoreAllMocks();

    for (const temporaryDirectory of temporaryDirectories.splice(0)) {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("skips every analyzer when there are no notebooks", () => {
    const jsonSpy = vi.spyOn(jsonService, "analyze");
    const markdownSpy = vi.spyOn(markdownService, "analyzeContents");
    const pythonSpy = vi.spyOn(pythonService, "analyzeContents");

    const result = service.analyze({
      notebookFiles: [],
      pythonCommand: "python3",
      workingDirectory: "/repo",
    });

    expect(result.files).toBe(0);
    expect(jsonSpy).not.toHaveBeenCalled();
    expect(markdownSpy).not.toHaveBeenCalled();
    expect(pythonSpy).not.toHaveBeenCalled();
  });

  it("counts the cells, outputs, and executions a notebook reports", () => {
    vi.spyOn(pythonService, "analyzeContents").mockReturnValue({
      ...EMPTY_PYTHON_RESULT,
    });
    const { notebookFiles, workingDirectory } = writeNotebooks({
      "explore.ipynb": sampleNotebook,
    });

    const result = service.analyze({
      notebookFiles,
      pythonCommand: "python3",
      workingDirectory,
    });

    expect(result.files).toBe(1);
    expect(result.cells).toBe(3);
    expect(result.codeCells).toBe(1);
    expect(result.markdownCells).toBe(1);
    expect(result.rawCells).toBe(1);
    expect(result.outputs).toBe(2);
    expect(result.executedCells).toBe(1);
  });

  it("hands the code cells to the python analyzer", () => {
    const pythonSpy = vi
      .spyOn(pythonService, "analyzeContents")
      .mockReturnValue({
        ...EMPTY_PYTHON_RESULT,
        classes: 2,
        decorators: 3,
        functions: 4,
        imports: 5,
        lines: 6,
      });
    const { notebookFiles, workingDirectory } = writeNotebooks({
      "explore.ipynb": sampleNotebook,
    });

    const result = service.analyze({
      notebookFiles,
      pythonCommand: "uv run python",
      workingDirectory,
    });

    expect(pythonSpy).toHaveBeenCalledExactlyOnceWith({
      command: "uv run python",
      contents: ["import math\n\ndef area(radius):\n    return 1\n"],
      workingDirectory,
    });
    expect(result.classes).toBe(2);
    expect(result.decorators).toBe(3);
    expect(result.functions).toBe(4);
    expect(result.imports).toBe(5);
    expect(result.codeLines).toBe(6);
  });

  it("hands the markdown cells to the markdown analyzer", () => {
    vi.spyOn(pythonService, "analyzeContents").mockReturnValue({
      ...EMPTY_PYTHON_RESULT,
    });
    const markdownSpy = vi.spyOn(markdownService, "analyzeContents");
    const { notebookFiles, workingDirectory } = writeNotebooks({
      "explore.ipynb": sampleNotebook,
    });

    const result = service.analyze({
      notebookFiles,
      pythonCommand: "python3",
      workingDirectory,
    });

    expect(markdownSpy).toHaveBeenCalledExactlyOnceWith([
      "# Title\n\nSome [prose](https://example.com).\n",
    ]);
    expect(result.headings).toBe(1);
    expect(result.links).toBe(1);
    expect(result.markdownLines).toBe(4);
  });

  it("measures the notebook document itself as JSON", () => {
    vi.spyOn(pythonService, "analyzeContents").mockReturnValue({
      ...EMPTY_PYTHON_RESULT,
    });
    const { notebookFiles, workingDirectory } = writeNotebooks({
      "explore.ipynb": sampleNotebook,
    });

    const result = service.analyze({
      notebookFiles,
      pythonCommand: "python3",
      workingDirectory,
    });

    expect(result.properties).toBeGreaterThan(0);
    expect(result.totalNodes).toBeGreaterThan(0);
    expect(result.maxDepth).toBeGreaterThan(1);
  });

  it("reads a cell source given as one string", () => {
    vi.spyOn(pythonService, "analyzeContents").mockReturnValue({
      ...EMPTY_PYTHON_RESULT,
    });
    const pythonSpy = vi.spyOn(pythonService, "analyzeContents");
    const { notebookFiles, workingDirectory } = writeNotebooks({
      "plain.ipynb": {
        cells: [{ cell_type: "code", source: "print('hello')\n" }],
      },
    });

    service.analyze({
      notebookFiles,
      pythonCommand: "python3",
      workingDirectory,
    });

    expect(pythonSpy).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ contents: ["print('hello')\n"] }),
    );
  });

  it("treats a cell with no source as empty", () => {
    const pythonSpy = vi
      .spyOn(pythonService, "analyzeContents")
      .mockReturnValue({ ...EMPTY_PYTHON_RESULT });
    const { notebookFiles, workingDirectory } = writeNotebooks({
      "sparse.ipynb": { cells: [{ cell_type: "code" }] },
    });

    const result = service.analyze({
      notebookFiles,
      pythonCommand: "python3",
      workingDirectory,
    });

    expect(pythonSpy).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ contents: [""] }),
    );
    expect(result.codeCells).toBe(1);
  });

  it("counts a notebook with no cells at all", () => {
    vi.spyOn(pythonService, "analyzeContents").mockReturnValue({
      ...EMPTY_PYTHON_RESULT,
    });
    const { notebookFiles, workingDirectory } = writeNotebooks({
      "empty.ipynb": { metadata: {}, nbformat: 4 },
    });

    const result = service.analyze({
      notebookFiles,
      pythonCommand: "python3",
      workingDirectory,
    });

    expect(result.files).toBe(1);
    expect(result.cells).toBe(0);
  });

  it("skips a malformed notebook and warns", () => {
    vi.spyOn(pythonService, "analyzeContents").mockReturnValue({
      ...EMPTY_PYTHON_RESULT,
    });
    const { notebookFiles, workingDirectory } = writeNotebooks({
      "broken.ipynb": "{ not json",
      "good.ipynb": sampleNotebook,
    });

    const result = service.analyze({
      notebookFiles,
      pythonCommand: "python3",
      workingDirectory,
    });

    expect(result.files).toBe(1);
    expect(loggerService.warn).toHaveBeenCalledWith(
      "📓 Skipped notebook analysis",
      undefined,
      expect.objectContaining({ filePath: "broken.ipynb" }),
    );
  });

  it("reports a thrown value that is not an Error", () => {
    vi.spyOn(pythonService, "analyzeContents").mockReturnValue({
      ...EMPTY_PYTHON_RESULT,
    });
    const { notebookFiles, workingDirectory } = writeNotebooks({
      "throws-a-string.ipynb": "",
    });

    const result = service.analyze({
      notebookFiles,
      pythonCommand: "python3",
      workingDirectory,
    });

    expect(result.files).toBe(0);
    expect(loggerService.warn).toHaveBeenCalledWith(
      "📓 Skipped notebook analysis",
      undefined,
      { filePath: "throws-a-string.ipynb", reason: "not an Error" },
    );
  });

  it("skips a notebook whose cells are not an array", () => {
    vi.spyOn(pythonService, "analyzeContents").mockReturnValue({
      ...EMPTY_PYTHON_RESULT,
    });
    const { notebookFiles, workingDirectory } = writeNotebooks({
      "odd.ipynb": { cells: "not an array" },
    });

    const result = service.analyze({
      notebookFiles,
      pythonCommand: "python3",
      workingDirectory,
    });

    expect(result.files).toBe(0);
  });
});
