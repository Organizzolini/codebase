import { Injectable } from "@nestjs/common";

import { SQL_LINE_COMMENT_PATTERN } from "../sql/sql.constants";

import type { CommentToken } from "./comments.types";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Reads SQL's `--` and `/* ... *\/` comments.
 *
 * A line scanner rather than a tokenizer, so a `--` or `/*` inside a `'…'`
 * string literal is read as a comment here exactly as it already is when
 * `SqlService` counts keywords — the reading is the same, only the positions
 * are new. The block form is found with `indexOf` rather than a regular
 * expression: a pattern matching an unclosed `/*` through to end of input has
 * to fail once per occurrence, which is quadratic on adversarial input, while
 * two `indexOf` calls per comment never scan the same text twice.
 */
@Injectable()
/* v8 ignore stop */
export class SqlCommentsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Every `/* *\/` comment's span, left to right and never overlapping. */
  private findBlockComments(content: string): { end: number; start: number }[] {
    const spans: { end: number; start: number }[] = [];
    let cursor = 0;

    for (
      let start = content.indexOf("/*", cursor);
      start !== -1;
      start = content.indexOf("/*", cursor)
    ) {
      const close = content.indexOf("*/", start + 2);

      if (close === -1) {
        break;
      }

      const end = close + 2;

      spans.push({ end, start });
      cursor = end;
    }

    return spans;
  }

  /** Whether only whitespace precedes an offset on its own line. */
  private isOwnLine(content: string, index: number): boolean {
    const lineStart = content.lastIndexOf("\n", index - 1) + 1;

    return content.slice(lineStart, index).trim() === "";
  }

  /** The 1-indexed line an offset sits on. */
  private lineOf(content: string, index: number): number {
    return content.slice(0, index).split("\n").length;
  }

  /** Every block comment's span, as a positioned token. */
  private readBlocks(
    content: string,
  ): { end: number; start: number; token: CommentToken }[] {
    return this.findBlockComments(content).map(({ end, start }) => ({
      end,
      start,
      token: {
        line: this.lineOf(content, start),
        ownLine: this.isOwnLine(content, start),
        prose: content.slice(start + 2, end - 2),
        source: content.slice(start, end),
      },
    }));
  }

  /** Every match of a comment pattern, as a positioned token. */
  private readMatches(
    content: string,
    pattern: RegExp,
    stripMarker: (source: string) => string,
  ): { end: number; start: number; token: CommentToken }[] {
    return [...content.matchAll(pattern)].map((match) => {
      const source = match[0];
      const start = match.index;

      return {
        end: start + source.length,
        start,
        token: {
          line: this.lineOf(content, start),
          ownLine: this.isOwnLine(content, start),
          prose: stripMarker(source),
          source,
        },
      };
    });
  }

  // 🌎 Public Methods

  /**
   * Reads every `--` and `/* *\/` comment, in the order they appear.
   *
   * Block spans are found first so a `--` matched inside one can be
   * dropped — the block already spans the whole thing, and without dropping
   * the overlap a `--` written as prose inside a block would be measured a
   * second time as a comment of its own.
   */
  read(content: string): CommentToken[] {
    const blocks = this.readBlocks(content);
    const lines = this.readMatches(
      content,
      SQL_LINE_COMMENT_PATTERN,
      (source) => source.slice(2),
    ).filter(
      (line) =>
        !blocks.some(
          (block) => line.start >= block.start && line.start < block.end,
        ),
    );

    return [...blocks, ...lines]
      .toSorted((first, second) => first.start - second.start)
      .map(({ token }) => token);
  }
}
