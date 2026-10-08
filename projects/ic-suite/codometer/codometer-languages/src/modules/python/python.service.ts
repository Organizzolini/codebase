import { execSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import { EMPTY_PYTHON_RESULT } from "./python.constants";

import type {
  AnalyzePythonArguments,
  AnalyzePythonContentsArguments,
  PythonResult,
} from "./python.types";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Executes the Python analysis script and returns aggregated metrics.
 */
@Injectable()
/* v8 ignore stop */
export class PythonService {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(PythonService.name);
  }

  // 🔐 Private Fields

  private readonly scriptPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "python.service.py",
  );

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Analyze the given Python files, resolved relative to the directory.
   *
   * The interpreter comes from the configuration because reaching Python is a
   * property of the repository, not of the analysis: a managed environment is
   * entered with `uv run python` or `poetry run python`, and a plain one with
   * `python3`.
   *
   * The paths travel over stdin rather than argv so that a repository with
   * thousands of Python files cannot overflow the command-line length limit.
   */
  analyze(args: AnalyzePythonArguments): PythonResult {
    if (args.pythonFiles.length === 0) {
      return { ...EMPTY_PYTHON_RESULT, commentTokens: [] };
    }

    try {
      const output = execSync(`${args.command} "${this.scriptPath}"`, {
        cwd: args.workingDirectory,
        encoding: "utf8",
        input: args.pythonFiles.join("\n"),
      });

      return JSON.parse(output.trim()) as PythonResult;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`🐍 Skipped Python analysis`, undefined, {
        reason: message,
      });
      return { ...EMPTY_PYTHON_RESULT, commentTokens: [] };
    }
  }

  /**
   * Analyze Python source text that never came from a file of its own.
   *
   * The seam the jupyter analyzer reads through. The interpreter reads files,
   * so the sources are staged in a temporary directory first — but the
   * analysis still runs from the measured directory, because a command like
   * `uv run python` resolves its environment from the working directory and
   * would find no project under the system temp directory.
   */
  analyzeContents(args: AnalyzePythonContentsArguments): PythonResult {
    if (args.contents.length === 0) {
      return { ...EMPTY_PYTHON_RESULT, commentTokens: [] };
    }

    const stagingDirectory = mkdtempSync(
      path.join(tmpdir(), "codometer-python-"),
    );

    try {
      const pythonFiles = args.contents.map((content, index) => {
        const stagedPath = path.join(stagingDirectory, `source-${index}.py`);
        writeFileSync(stagedPath, content, "utf8");
        return stagedPath;
      });

      return this.analyze({
        command: args.command,
        pythonFiles,
        workingDirectory: args.workingDirectory,
      });
    } finally {
      rmSync(stagingDirectory, { force: true, recursive: true });
    }
  }
}
