// ♟️ Constants

/** Heading the rendered section is filed under. */
export const HEADING = "## ⏲️ Codometer";

/**
 * The block this report claims inside a shared document. HTML comments are
 * invisible once the markdown is rendered, and every other report claims its
 * own pair, so several can sit in one document without collision.
 */
export const CODOMETER_MARKERS = {
  end: "<!-- codometer-changes:end -->",
  start: "<!-- codometer-changes:start -->",
};

/** Column headers for a project's metrics table. */
export const TABLE_HEADER = [
  "| | Metric | Value | `main` | Change |",
  "|--|--------|-------|--------|--------|",
];
