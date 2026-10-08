// ♟️ Constants

/**
 * The start marker of any anchored block this convention recognizes, not
 * just the one a given destination owns.
 *
 * Used to find where a corrupted block — a start marker with no matching
 * end — has to stop being replaced: at another block's own territory,
 * never past it.
 */
export const FOREIGN_ANCHOR_PATTERN =
  /<!--\s*(?:[A-Za-z0-9_-]+:start|[A-Z0-9_]+_START)\b/i;

// 🚨 Errors

/** Raised when the anchor helper is asked to write a file nothing named. */
export class MissingMarkdownPathError extends Error {
  constructor() {
    super(
      "No markdown path to write to. Set write.markdown.path, pass --markdown, or give syncAnchoredBlock a path of its own.",
    );
    this.name = "MissingMarkdownPathError";
  }
}
