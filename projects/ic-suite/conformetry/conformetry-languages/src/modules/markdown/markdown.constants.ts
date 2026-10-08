// ♟️ Constants

import type { LanguageValidatorDescriptor } from "@conformetry/core";

/** Extensions the markdown validator claims. */
export const MARKDOWN_VALIDATOR_FILE_EXTENSIONS = [".md"];

/** Identifies the markdown language to the orchestrator and the `--languages` filter. */
export const MARKDOWN_VALIDATOR_DESCRIPTOR: LanguageValidatorDescriptor = {
  description: "Checks markdown structural conformance using mdast",
  fileExtensions: MARKDOWN_VALIDATOR_FILE_EXTENSIONS,
  name: "markdown",
};

/**
 * Node types whose children carry the meaning.
 *
 * These are matched by descending into them, so a heading nested inside a list
 * item is still required. Everything else is matched as a leaf on its own text.
 */
export const CONTAINER_TYPES = new Set<string>([
  "blockquote",
  "document",
  "list",
  "listItem",
  "root",
  "table",
  "tableCell",
  "tableRow",
]);

/**
 * Node types skipped entirely while walking.
 *
 * Bare text runs are compared as part of their parent's rendered text, so
 * matching them again on their own would double-report the same difference.
 */
export const SKIPPED_TYPES = new Set<string>(["text"]);
