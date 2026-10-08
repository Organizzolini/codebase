// ♟️ Constants

/** Stands in for a column a limit left empty, so the cell is never blank. */
export const ABSENT_LABEL = "—";

/** Heading the whole listing is written under. */
export const CONFIGURATION_HEADING = "# 🔧 Codometer Configuration";

/** Column headers of the limits table, in the order they are rendered. */
export const LIMIT_TABLE_COLUMNS = [
  "Directory",
  "Metric",
  "Label",
  "Severity",
  "Value",
  "Declared in",
] as const;

/**
 * Metric suffix marking a limit whose value is a number of bytes.
 *
 * A limit's value is a bare number by the time it is resolved, so nothing left
 * in the configuration says whether `256000` is a size or a count of files.
 * The metric path is what still does: only a size analysis produces `.size`.
 */
export const SIZE_METRIC_SUFFIX = ".size";
