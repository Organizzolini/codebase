// ♟️ Constants

/**
 * Metric path holding how many files a target's globs claimed.
 *
 * Present for every target whatever analyses it ran, because the count is the
 * match itself rather than anything an analysis reported.
 */
export const FILES_METRIC_PATH = "files";

/**
 * Prefix every configured counter's metric path carries.
 *
 * Keeps a counter labelled `files` from answering to the same path the file
 * count does, which is a collision the label alone would have caused.
 */
export const CUSTOM_METRIC_PREFIX = "custom";

/** Separator between the parts of a metric's dotted path. */
export const METRIC_PATH_SEPARATOR = ".";

/**
 * Metric path holding the bytes size analysis measured.
 *
 * The whole of what a size analysis reports: which compression produced the
 * bytes is context for reading the number, not a second number to gate.
 */
export const SIZE_METRIC_PATH = "size";

// 🚨 Errors

/**
 * Raised when a target carrying a limit matched no files at all.
 *
 * Writing a limit asserts the files exist, so nothing to measure means a glob
 * that no longer matches or a build that never ran — either way a number that
 * would pass every limit written against it. A target nobody limited is left
 * alone: there it is simply zero, and unremarkable.
 */
export class EmptyTargetError extends Error {
  constructor(target: string, metric: string) {
    super(
      `Input "${target}" matched no files, and a limit is written against its "${metric}" metric. A limit says the files are there, so an empty match is a glob that stopped matching or a build that never ran — not a measurement of zero.`,
    );
    this.name = "EmptyTargetError";
  }
}

/**
 * Raised when a limit's dotted path does not name exactly one metric.
 *
 * Both halves of that are failures worth stopping for. A path naming nothing
 * gates nothing while looking like a gate, and a path naming several would
 * have to pick one — and a limit quietly holding the wrong metric is a limit
 * nobody would ever discover was wrong.
 */
export class UnboundMetricError extends Error {
  constructor(path: string, reason: string) {
    super(`Cannot bind the limit written against "${path}": ${reason}`);
    this.name = "UnboundMetricError";
  }
}
