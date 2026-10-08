// ♟️ Constants

import type { ShellResult } from "./shell.types";

/** Matches a function declaration in either POSIX or `function` form. */
export const SHELL_FUNCTION_PATTERN =
  /^(?:function\s+)?[\w-]+\s*\(\s*\)|^function\s+[\w-]+/;

/** Matches an exported variable assignment. */
export const SHELL_EXPORT_PATTERN = /^(?:export|declare\s+-x)\s+[A-Za-z_]\w*=/;

/** Matches a plain variable assignment, including `local` and `readonly`. */
export const SHELL_VARIABLE_PATTERN =
  /^(?:local\s+|readonly\s+|declare\s+)?[A-Za-z_]\w*=/;

/** Matches the opening of a conditional. */
export const SHELL_CONDITIONAL_PATTERN = /(?:^|;\s*)(?:if|elif|case)\s/;

/** Matches the opening of a loop. */
export const SHELL_LOOP_PATTERN = /(?:^|;\s*)(?:for|while|until)\s/;

/** Matches a pipe joining two commands, but never a logical `||`. */
export const SHELL_PIPELINE_PATTERN = /(?<!\|)\|(?!\|)/g;

/** Empty metrics used to initialize analyzer state. */
export const EMPTY_SHELL_RESULT: ShellResult = {
  commentLines: 0,
  comments: 0,
  conditionals: 0,
  exports: 0,
  files: 0,
  functions: 0,
  lines: 0,
  loops: 0,
  pipelines: 0,
  shebangs: 0,
  variables: 0,
};
