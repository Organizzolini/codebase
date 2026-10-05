import { readFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import {
  EMPTY_SHELL_RESULT,
  SHELL_CONDITIONAL_PATTERN,
  SHELL_EXPORT_PATTERN,
  SHELL_FUNCTION_PATTERN,
  SHELL_LOOP_PATTERN,
  SHELL_PIPELINE_PATTERN,
  SHELL_VARIABLE_PATTERN,
} from "./shell.constants";

import type { ShellInput, ShellResult } from "./shell.types";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Counts the constructs a shell script is built from.
 *
 * Pattern-based rather than parsed: shell has no syntax tree available without
 * a native dependency, and a heuristic that a reader would agree with is worth
 * more here than no measurement at all. Comment lines are recognized before
 * anything else so that a `#` opening a line never reads as code.
 */
@Injectable()
/* v8 ignore stop */
export class ShellService {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(ShellService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Records the constructs one line of shell holds. */
  private countLine(line: string, result: ShellResult): void {
    const trimmed = line.trim();

    if (trimmed.startsWith("#!")) {
      result.shebangs++;
      return;
    }

    if (trimmed.startsWith("#")) {
      result.comments++;
      result.commentLines++;
      return;
    }

    if (trimmed === "") {
      return;
    }

    this.countStatements(trimmed, result);
  }

  /** Records the constructs a line of shell code holds. */
  private countStatements(line: string, result: ShellResult): void {
    if (SHELL_FUNCTION_PATTERN.test(line)) {
      result.functions++;
    }

    if (SHELL_EXPORT_PATTERN.test(line)) {
      result.exports++;
    } else if (SHELL_VARIABLE_PATTERN.test(line)) {
      result.variables++;
    }

    if (SHELL_CONDITIONAL_PATTERN.test(line)) {
      result.conditionals++;
    }

    if (SHELL_LOOP_PATTERN.test(line)) {
      result.loops++;
    }

    // Every `|` that is not `||` joins two commands into a pipeline.
    result.pipelines += (line.match(SHELL_PIPELINE_PATTERN) ?? []).length;
  }

  // 🌎 Public Methods

  /** Analyze the given shell scripts, resolved against the directory. */
  analyze({ shellFiles, workingDirectory }: ShellInput): ShellResult {
    const result: ShellResult = { ...EMPTY_SHELL_RESULT };

    for (const filePath of shellFiles) {
      try {
        const content = readFileSync(
          path.resolve(workingDirectory, filePath),
          "utf8",
        );
        const lines = content.split("\n");

        result.files++;
        result.lines += lines.length;

        for (const line of lines) {
          this.countLine(line, result);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn("🐚 Skipped shell analysis", undefined, {
          filePath,
          reason: message,
        });
        continue;
      }
    }

    return result;
  }
}
