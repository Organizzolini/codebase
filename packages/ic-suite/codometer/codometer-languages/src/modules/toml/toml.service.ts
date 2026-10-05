import { readFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import {
  EMPTY_TOML_RESULT,
  TOML_ARRAY_TABLE_PATTERN,
  TOML_MULTILINE_DELIMITER_PATTERN,
  TOML_TABLE_PATTERN,
} from "./toml.constants";

import type { TomlInput, TomlResult } from "./toml.types";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Counts the tables, keys, and arrays a TOML document declares.
 *
 * Read line by line while tracking whether a multi-line string is open, so a
 * `#` or a `[heading]` inside one of those strings is content rather than
 * syntax. That state is the whole reason this is not three regexes.
 */
@Injectable()
/* v8 ignore stop */
export class TomlService {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(TomlService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Records a key assignment and whether its value opens an array. */
  private countKey(line: string, result: TomlResult): void {
    const separatorIndex = line.indexOf("=");

    if (separatorIndex <= 0) {
      return;
    }

    result.keys++;

    if (
      line
        .slice(separatorIndex + 1)
        .trim()
        .startsWith("[")
    ) {
      result.arrays++;
    }
  }

  /** Records the declaration one line of TOML holds. */
  private countLine(line: string, result: TomlResult): void {
    const trimmed = line.trim();

    if (trimmed.startsWith("#")) {
      result.comments++;
      return;
    }

    if (TOML_ARRAY_TABLE_PATTERN.test(trimmed)) {
      result.arrayTables++;
      return;
    }

    if (TOML_TABLE_PATTERN.test(trimmed)) {
      result.tables++;
      return;
    }

    this.countKey(trimmed, result);
  }

  /**
   * Whether the line closes the multi-line string that was open, or opens one.
   *
   * An odd number of `"""` or `'''` delimiters flips the state; an even number
   * opens and closes within the same line and leaves it as it was.
   */
  private isInsideMultilineString(line: string, wasInside: boolean): boolean {
    const delimiters = (line.match(TOML_MULTILINE_DELIMITER_PATTERN) ?? [])
      .length;

    return delimiters % 2 === 0 ? wasInside : !wasInside;
  }

  // 🌎 Public Methods

  /** Analyze the given TOML documents, resolved against the directory. */
  analyze({ tomlFiles, workingDirectory }: TomlInput): TomlResult {
    const result: TomlResult = { ...EMPTY_TOML_RESULT };

    for (const filePath of tomlFiles) {
      try {
        const content = readFileSync(
          path.resolve(workingDirectory, filePath),
          "utf8",
        );
        const lines = content.split("\n");
        let isInsideString = false;

        result.files++;
        result.lines += lines.length;

        for (const line of lines) {
          if (!isInsideString) {
            this.countLine(line, result);
          }

          isInsideString = this.isInsideMultilineString(line, isInsideString);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn("🧰 Skipped TOML analysis", undefined, {
          filePath,
          reason: message,
        });
        continue;
      }
    }

    return result;
  }
}
