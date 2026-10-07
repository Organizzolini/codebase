// ♟️ Constants

import type { RenderOptions } from "mustache";

/**
 * Mustache options used for every render.
 *
 * Escaping is disabled. Mustache HTML-escapes `{{field}}` by default, so a
 * substitution containing `&`, `<`, or `>` would be written into generated
 * source as `&amp;` and corrupt it. Passing `escape` per call leaves
 * mustache's global `escape` untouched, so nothing else in the process is
 * affected, and templates keep using `{{field}}` rather than `{{{field}}}`.
 */
export const MUSTACHE_RENDER_OPTIONS: RenderOptions = {
  escape: String,
};

// 🚨 Errors

/**
 * Raised when a template interpolates a placeholder nobody supplied a value
 * for.
 *
 * Refusing is the only outcome that cannot be mistaken for success: mustache
 * would render the placeholder as an empty string, and because generation and
 * validation render identically, both halves of the loop would lose the same
 * value and agree that nothing was wrong. Section tags are exempt, and why is
 * in this package's README.
 */
export class MissingSubstitutionError extends Error {
  constructor(args: { placeholders: readonly string[]; subject: string }) {
    const asked = args.placeholders
      .map((placeholder) => `{{${placeholder}}}`)
      .join(", ");

    super(
      `No value was supplied for ${asked} while rendering ${args.subject}. Declare each one as an input of the generator, and in the matching instance group's substitutions.`,
    );
    this.name = "MissingSubstitutionError";
  }
}

/**
 * Recognizes a placeholder value: the random stand-in validation renders for a
 * placeholder nothing supplied, so a language can tell it from literal text.
 * A letter first keeps the value a legal identifier wherever it lands.
 */
export const PLACEHOLDER_VALUE_PATTERN = /conformetry[0-9a-f]{32}/g;

/** The letters every placeholder value starts with. */
export const PLACEHOLDER_VALUE_PREFIX = "conformetry";
