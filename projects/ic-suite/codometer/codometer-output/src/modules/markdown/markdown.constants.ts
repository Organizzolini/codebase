// ♟️ Constants

/**
 * Section heading every rendered statistics block sits under.
 *
 * Rendered rather than written into each README by hand: it is inside the
 * markers, so every run rewrites the heading along with the figures beneath it
 * and the twenty-odd documents carrying this block cannot drift apart. Written
 * by hand it would be twenty-odd headings maintained one at a time, which is
 * the state the block exists to replace.
 *
 * Emitted for both scopes, repository and project alike, so no document
 * carries a hand-maintained heading that could drift from this one.
 */
export const CODOMETER_SECTION_HEADING = "## ⏲️ Codometer";

/**
 * Characters that carry meaning inside a regular expression.
 *
 * The block markers are configurable, so they reach the matcher as arbitrary
 * text and have to be escaped before they can be searched for.
 */
export const REGEX_SPECIAL_CHARACTERS = /[.*+?^${}()|[\]\\]/g;

/**
 * The newlines a file already ends with, however many there are.
 *
 * Stripped before the block is appended, so the separator between the existing
 * document and the block is exactly one blank line whether the file ended with
 * a newline, several, or none.
 */
export const TRAILING_NEWLINES = /\n+$/;

// 🚨 Errors

/** Raised when the anchor helper is asked to write a file nothing named. */
export class MissingMarkdownPathError extends Error {
  constructor() {
    super(
      "No markdown path to write to. Set output.markdown.path, pass --markdown, or give syncAnchoredBlock a path of its own.",
    );
    this.name = "MissingMarkdownPathError";
  }
}
