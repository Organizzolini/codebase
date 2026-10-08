// ♟️ Constants

/** Stands in for a cell a limit left empty, so no cell is ever blank. */
export const ABSENT_LABEL = "—";

/** Column headers of the limits table, in the order they are rendered. */
export const LIMIT_TABLE_COLUMNS = [
  "Project",
  "Limit",
  "Value",
  "Declared in",
] as const;

/** Heading the listing is written under. */
export const LIMITS_HEADING = "# 🔭 Callidescope Limits";

/** Says what the table holds, so it needs no second reading. */
export const LIMITS_SUMMARY =
  "Every project in scope, what it is judged against, and the file each number is written in — which is that project's own `callidescope.config.ts`, every traced project declaring a complete one. The `workspace` row is the starting point those files spread, and the numbers the directory holding this configuration is itself judged by.";

/**
 * What a value cell says when nothing anywhere declares the limit.
 *
 * Breadth has no workspace default and no tool default, so a project that
 * declares none is gated by nothing at all. Printing a number here — the
 * workspace's, or an invented one — would say the opposite.
 */
export const NO_LIMIT_LABEL = "none";

/**
 * Names the project rooted at the workspace root itself.
 *
 * Its workspace-relative root is the empty string, which would print as a
 * blank cell — and a blank cell in a listing of what gates what reads as
 * something missing rather than as the directory it is.
 */
export const ROOT_PROJECT_LABEL = ".";

/** Names the row carrying the defaults every project's file spreads. */
export const WORKSPACE_LABEL = "workspace";
