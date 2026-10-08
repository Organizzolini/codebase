import { existsSync } from "node:fs";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { EMPTY_PYTHON_RESULT } from "./python.constants";
import { PythonService } from "./python.service";

import type { DeepMocked } from "@golevelup/ts-vitest";

const { execSyncMock } = vi.hoisted(() => ({
  execSyncMock: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execSync: execSyncMock,
}));

describe(PythonService, () => {
  let service: PythonService;
  let loggerService: DeepMocked<LoggerService>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PythonService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    service = await module.resolve(PythonService);
    loggerService = await module.resolve(LoggerService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("skips the interpreter when there are no python files", () => {
    const result = service.analyze({
      command: "python3",
      pythonFiles: [],
      workingDirectory: "/repo",
    });

    expect(execSyncMock).not.toHaveBeenCalled();
    expect(result.files).toBe(0);
  });

  it("passes the discovered file list to the script over stdin", () => {
    execSyncMock.mockReturnValue(JSON.stringify(EMPTY_PYTHON_RESULT));

    service.analyze({
      command: "uv run python",
      pythonFiles: ["src/app.py", "src/other.py"],
      workingDirectory: "/repo",
    });

    expect(execSyncMock).toHaveBeenCalledWith(
      expect.stringContaining("uv run python"),
      expect.objectContaining({ input: "src/app.py\nsrc/other.py" }),
    );
  });

  it("returns parsed python metrics when script execution succeeds", () => {
    execSyncMock.mockReturnValue(
      JSON.stringify({
        classes: 1,
        commentLines: 3,
        comments: 2,
        constants: 4,
        decorators: 5,
        docstringLines: 7,
        docstrings: 6,
        files: 8,
        functions: 9,
        imports: 10,
        lines: 11,
        protocols: 12,
      }),
    );

    const result = service.analyze({
      command: "uv run python",
      pythonFiles: ["src/app.py"],
      workingDirectory: "/repo",
    });

    expect(execSyncMock).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining("uv run python"),
      {
        cwd: "/repo",
        encoding: "utf8",
        input: "src/app.py",
      },
    );
    expect(result).toStrictEqual({
      classes: 1,
      commentLines: 3,
      comments: 2,
      constants: 4,
      decorators: 5,
      docstringLines: 7,
      docstrings: 6,
      files: 8,
      functions: 9,
      imports: 10,
      lines: 11,
      protocols: 12,
    });
  });

  it("returns empty metrics and logs a warning when execution fails", () => {
    execSyncMock.mockImplementation(() => {
      throw new Error("failed to execute");
    });

    const result = service.analyze({
      command: "uv run python",
      pythonFiles: ["src/app.py"],
      workingDirectory: "/repo",
    });

    expect(result).toStrictEqual({
      classes: 0,
      commentLines: 0,
      comments: 0,
      commentTokens: [],
      constants: 0,
      decorators: 0,
      docstringLines: 0,
      docstrings: 0,
      files: 0,
      functions: 0,
      imports: 0,
      lines: 0,
      protocols: 0,
    });
    expect(loggerService.warn).toHaveBeenCalledWith(
      "🐍 Skipped Python analysis",
      undefined,
      expect.any(Object),
    );
  });

  it("handles non-Error exceptions gracefully", () => {
    execSyncMock.mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw "string error";
    });

    const result = service.analyze({
      command: "uv run python",
      pythonFiles: ["src/app.py"],
      workingDirectory: "/repo",
    });

    expect(result).toStrictEqual({
      classes: 0,
      commentLines: 0,
      comments: 0,
      commentTokens: [],
      constants: 0,
      decorators: 0,
      docstringLines: 0,
      docstrings: 0,
      files: 0,
      functions: 0,
      imports: 0,
      lines: 0,
      protocols: 0,
    });
    expect(loggerService.warn).toHaveBeenCalledWith(
      "🐍 Skipped Python analysis",
      undefined,
      expect.any(Object),
    );
  });

  it("returns empty metrics for no source text", () => {
    const result = service.analyzeContents({
      command: "python3",
      contents: [],
      workingDirectory: "/repo",
    });

    expect(execSyncMock).not.toHaveBeenCalled();
    expect(result.files).toBe(0);
  });

  it("stages source text as files and analyzes it from the measured directory", () => {
    let workingDirectory = "";
    let stagedPaths: string[] = [];
    execSyncMock.mockImplementation((_command: string, options?: object) => {
      // Narrowed rather than asserted: the mock declares the options as a bare
      // object, and `in` is what turns that into the two fields read here.
      if (options !== undefined && "cwd" in options && "input" in options) {
        workingDirectory = String(options.cwd);
        stagedPaths = String(options.input).split("\n");
      }

      return JSON.stringify({ ...EMPTY_PYTHON_RESULT, functions: 2 });
    });

    const result = service.analyzeContents({
      command: "uv run python",
      contents: ["def one():\n    return 1\n", "def two():\n    return 2\n"],
      workingDirectory: "/repo",
    });

    // Staged outside the repository, but analyzed from inside it: a command
    // like `uv run python` resolves its environment from the cwd.
    expect(workingDirectory).toBe("/repo");
    expect(stagedPaths).toHaveLength(2);

    for (const stagedPath of stagedPaths) {
      expect(stagedPath.endsWith(".py")).toBe(true);
      // The staging directory is removed once the interpreter has run.
      expect(existsSync(stagedPath)).toBe(false);
    }

    expect(result.functions).toBe(2);
  });
});
