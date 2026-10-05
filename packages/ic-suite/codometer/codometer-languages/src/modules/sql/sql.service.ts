import { readFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import {
  EMPTY_SQL_RESULT,
  SQL_BLOCK_COMMENT_PATTERN,
  SQL_KEYWORD_PATTERNS,
  SQL_LINE_COMMENT_PATTERN,
} from "./sql.constants";

import type { SqlInput, SqlResult } from "./sql.types";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Counts the statements and clauses a SQL script is built from.
 *
 * Comments are stripped before anything is counted, so a `SELECT` inside a
 * `--` explanation is prose rather than a query. Statements are separated on
 * semicolons, which is what the dialect-agnostic reading of a script is.
 */
@Injectable()
/* v8 ignore stop */
export class SqlService {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(SqlService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Records every keyword occurrence in the comment-free source. */
  private countKeywords(source: string, result: SqlResult): void {
    for (const [field, pattern] of SQL_KEYWORD_PATTERNS) {
      result[field] += (source.match(pattern) ?? []).length;
    }
  }

  /** Counts the comments in a script and returns the source without them. */
  private stripComments(content: string, result: SqlResult): string {
    const withoutBlocks = content.replaceAll(SQL_BLOCK_COMMENT_PATTERN, () => {
      result.comments++;
      return " ";
    });

    return withoutBlocks.replaceAll(SQL_LINE_COMMENT_PATTERN, () => {
      result.comments++;
      return " ";
    });
  }

  // 🌎 Public Methods

  /** Analyze the given SQL scripts, resolved against the directory. */
  analyze({ sqlFiles, workingDirectory }: SqlInput): SqlResult {
    const result: SqlResult = { ...EMPTY_SQL_RESULT };

    for (const filePath of sqlFiles) {
      try {
        const content = readFileSync(
          path.resolve(workingDirectory, filePath),
          "utf8",
        );

        result.files++;
        result.lines += content.split("\n").length;

        const source = this.stripComments(content, result);

        result.statements += source
          .split(";")
          .filter((statement) => statement.trim() !== "").length;
        this.countKeywords(source, result);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn("🗄️ Skipped SQL analysis", undefined, {
          filePath,
          reason: message,
        });
        continue;
      }
    }

    return result;
  }
}
