import type { MetricRow } from "../changes/changes.types";
import type { MetricUnit } from "@codometer/core";

/**
 * Formats a byte count, switching to megabytes once kilobytes get unwieldy.
 *
 * Kilobytes are decimal, matching what codometer parses out of a limit written
 * as `"8 KB"`. Dividing by 1024 here would print a limit as a number the
 * configuration never mentions.
 */
export function formatBytes(bytes: number): string {
  if (Math.abs(bytes) >= 1_000_000) {
    return `${(bytes / 1_000_000).toFixed(2)} MB`;
  }
  return `${(bytes / 1000).toFixed(2)} kB`;
}

/** Formats a plain count, grouped with the reader's locale separators. */
export function formatCount(value: number): string {
  return value.toLocaleString();
}

/** Formats a signed delta, or an em dash when there is nothing to compare. */
export function formatDelta(
  delta: number | undefined,
  unit: MetricUnit,
): string {
  if (delta === undefined) return "—";
  const formatted = formatValue(delta, unit);
  return delta >= 0 ? `+${formatted}` : formatted;
}

/** Formats a value the way its unit calls for. */
export function formatValue(value: number, unit: MetricUnit): string {
  return unit === "bytes" ? formatBytes(value) : formatCount(value);
}

/**
 * Whether a metric changed since the baseline, or is breaching a limit right
 * now regardless of whether it moved.
 *
 * A row that neither changed nor breaches anything has nothing to tell a
 * reviewer, so it never reaches the table. A brand-new metric — one with no
 * baseline at all — counts as changed only when it measured something or its
 * target's globs matched nothing, because a zero-valued metric appearing for
 * the first time (every project carries a metric for every language
 * codometer knows, most of them zero) tells a reviewer nothing "appeared" —
 * least of all on the first run this report ever makes against a project,
 * where every metric is technically without a baseline at once.
 */
export function hasChanged(row: MetricRow): boolean {
  if (row.breach !== undefined) return true;
  if (row.baseValue === undefined) return row.value !== 0 || row.empty;
  return row.value !== row.baseValue;
}
