// ♟️ Constants

/**
 * Separator between a metric's target and its path within that target.
 *
 * The same character the configuration writes a limit's metric path with, so
 * a report's metric name reads exactly like the limit that addresses it.
 */
export const METRIC_NAME_SEPARATOR = ".";

/**
 * Metric path whose value counts bytes rather than things.
 *
 * The one metric a renderer has to know the unit of. Its value is raw and
 * decimal, so kilobytes are 1000 bytes and nothing here pre-divides.
 */
export const SIZE_METRIC_PATH = "size";
