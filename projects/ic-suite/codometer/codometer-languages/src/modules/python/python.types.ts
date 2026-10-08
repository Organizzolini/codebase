// 🏷️ Types

import type { LocatedCommentToken } from "../comments/comments.types";

/** Arguments accepted by the Python analyzer. */
export interface AnalyzePythonArguments {
  command: string;
  pythonFiles: string[];
  workingDirectory: string;
}

/** Arguments accepted when analyzing Python source text without files. */
export interface AnalyzePythonContentsArguments {
  command: string;
  contents: string[];
  workingDirectory: string;
}

/**
 * Aggregated statistics produced by the Python analyzer.
 */
export interface PythonResult {
  classes: number;
  commentLines: number;
  comments: number;
  /** Every comment `tokenize` found, with the file it was found in. */
  commentTokens: LocatedCommentToken[];
  constants: number;
  decorators: number;
  docstringLines: number;
  docstrings: number;
  files: number;
  functions: number;
  imports: number;
  lines: number;
  protocols: number;
}
