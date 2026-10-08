// ♟️ Constants

import type { SqlResult } from "./sql.types";

/**
 * Matches a `/* … *\/` comment, including one spanning several lines.
 *
 * Written to match one star at a time rather than as `[\s\S]*?\*\/`, whose
 * backtracking cost grows fast on a long run of unclosed `/*` markers — a
 * lazy dot-all is the classic shape CodeQL flags as slow on adversarial
 * input, and an unclosed comment inside a large file is exactly that shape.
 */
export const SQL_BLOCK_COMMENT_PATTERN = /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g;

/** Matches a `--` comment through to the end of its line. */
export const SQL_LINE_COMMENT_PATTERN = /--[^\n]*/g;

/**
 * Maps each counted clause onto the pattern that recognizes it.
 *
 * Word boundaries keep `CREATED_AT` from reading as a `CREATE`, and the join
 * pattern accepts the qualifiers a dialect may put in front of one.
 */
export const SQL_KEYWORD_PATTERNS: [keyof SqlResult, RegExp][] = [
  ["commonTableExpressions", /\bWITH\b/gi],
  ["creates", /\bCREATE\b/gi],
  ["deletes", /\bDELETE\b/gi],
  ["inserts", /\bINSERT\b/gi],
  ["joins", /\b(?:CROSS|FULL|INNER|LEFT|NATURAL|OUTER|RIGHT)?\s*JOIN\b/gi],
  ["selects", /\bSELECT\b/gi],
  ["updates", /\bUPDATE\b/gi],
];

/** Empty metrics used to initialize analyzer state. */
export const EMPTY_SQL_RESULT: SqlResult = {
  comments: 0,
  commonTableExpressions: 0,
  creates: 0,
  deletes: 0,
  files: 0,
  inserts: 0,
  joins: 0,
  lines: 0,
  selects: 0,
  statements: 0,
  updates: 0,
};
