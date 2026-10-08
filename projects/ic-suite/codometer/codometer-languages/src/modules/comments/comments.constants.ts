// ♟️ Constants

/**
 * How much of a block's prose a measurement carries to identify it.
 *
 * Long enough that two blocks in one file read differently, short enough that
 * a breach stays one line of markdown.
 */
export const COMMENT_EXCERPT_LENGTH = 48;

/** What a measured comment block is called in a report. */
export const COMMENT_KIND = "comment";

/** Matches an HCL `#` comment through to the end of its line. */
export const HCL_HASH_LINE_COMMENT_PATTERN = /#[^\n]*/g;

/** Matches an HCL `//` comment through to the end of its line. */
export const HCL_SLASH_LINE_COMMENT_PATTERN = /\/\/[^\n]*/g;

/**
 * A `#` comment's marker, and the space a writer puts after it.
 *
 * Shared by every language whose comments start with `#` — shell, TOML,
 * Python, and YAML — because the marker is the only thing they have in common
 * and it is exactly the same in all four.
 */
export const HASH_COMMENT_MARKER_PATTERN = /^\s*#+\s?/u;
