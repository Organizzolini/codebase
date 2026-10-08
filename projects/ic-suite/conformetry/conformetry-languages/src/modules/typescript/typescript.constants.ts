// ♟️ Constants

import type { LanguageValidatorDescriptor } from "@conformetry/core";

/** Extensions the TypeScript validator claims. */
export const TYPESCRIPT_VALIDATOR_FILE_EXTENSIONS = [".ts", ".tsx"];

/** Identifies the TypeScript language to the orchestrator and the `--languages` filter. */
export const TYPESCRIPT_VALIDATOR_DESCRIPTOR: LanguageValidatorDescriptor = {
  description: "Checks TypeScript AST structure and required comments",
  fileExtensions: TYPESCRIPT_VALIDATOR_FILE_EXTENSIONS,
  name: "typescript",
};

/**
 * Marks a template comment as a placeholder.
 *
 * A template's `// TODO: Document this` is a prompt to write something, not
 * text to copy, so any instance comment satisfies it.
 */
export const TODO_COMMENT_PATTERN = /\bTODO\b/u;
