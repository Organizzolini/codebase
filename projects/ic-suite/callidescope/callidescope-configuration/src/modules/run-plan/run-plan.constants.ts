// ♟️ Constants

/**
 * What `--check breadth` asks the run to fail on: a callable calling too many
 * other callables directly.
 */
export const CHECK_BREADTH = "breadth";

/** What `--check depth` asks the run to fail on: a call stack that is too deep. */
export const CHECK_DEPTH = "depth";

/** What `--check reports` asks the run to fail on: a stale written report. */
export const CHECK_REPORTS = "reports";

/**
 * Everything `--check` accepts, in the order an error message lists them.
 *
 * Named here rather than spelled into each message, so the list a mistake is
 * measured against and the list it is told about can never drift apart.
 */
export const CHECK_NAMES = [CHECK_BREADTH, CHECK_DEPTH, CHECK_REPORTS];

/** How a `--check` value is written: one comma-separated set, no spaces needed. */
export const CHECK_SEPARATOR = ",";

/**
 * The flags that name where a report goes, rather than whether one is written.
 *
 * Kept as a list so the refusal in `RunPlanService.selectMode` names every one
 * the command line supplied, and so adding a destination flag without adding
 * it here is the only way to reintroduce a flag that writes nothing silently.
 */
export const DESTINATION_FLAG_NAMES = ["json", "markdown", "mermaid"] as const;
