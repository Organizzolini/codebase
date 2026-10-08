// 🏷️ Types

import type { codometerReportSchema } from "./changes.constants";
import type { z } from "zod";

/** One codometer report, as far as this diff reads it. */
export type CodometerReport = z.infer<typeof codometerReportSchema>;

/** Arguments for reading one project's report and its baseline. */
export interface CollectProjectRowsArguments extends CollectRowsArguments {
  reportPath: string;
}

/** Arguments for joining measured reports to a baseline. */
export interface CollectRowsArguments {
  baselineDirectory: string | undefined;
  workingDirectory: string;
}

/**
 * Everything one collection read: the rows, and what could not be measured.
 *
 * Both travel together because a table of rows alone cannot be read honestly.
 * A target that failed contributes no row, and the reader would have to count
 * rows against a list of projects to notice it was gone.
 */
export interface MetricCollection {
  failures: ProjectFailure[];
  rows: MetricRow[];
}

/** One metric joined to the project that measured it and to its baseline. */
export interface MetricRow extends ReportMetric {
  baseValue: number | undefined;
  /** False when this run did not rebuild the project, so the baseline stands in. */
  measured: boolean;
  project: string;
  /** True when the baseline had this metric and the current run does not. */
  removed: boolean;
}

/** How hard a breached limit lands: advisory, or fatal. */
export type MetricSeverity = "fail" | "warn";

/** The denomination a metric's value is counted in. */
export type MetricUnit = "bytes" | null;

/**
 * Something one project's run could not do, and what it was trying to do it to.
 *
 * Neither a breach nor staleness: it is the run not having finished. A `target`
 * failure means a set of files nobody measured, so the rows it would have
 * produced are absent from the table entirely.
 */
export interface ProjectFailure extends ReportFailure {
  project: string;
}

/** What one project's report yielded: its metrics, and what failed. */
export interface ProjectReport {
  failures: ReportFailure[];
  metrics: ReportMetric[];
}

/** One report's failure entry, as codometer writes it. */
export type ReportFailure = NonNullable<CodometerReport["failures"]>[number];

/** One limit as the report carries it. */
export type ReportLimit =
  CodometerReport["targets"][number]["metrics"][number]["limits"][number];

/**
 * One metric codometer measured, and whatever limits it.
 *
 * Everything a row needs from the report itself, before the project it belongs
 * to and the baseline it is compared against are joined onto it. Carries every
 * metric a target produced — a byte count, a symbol count, anything — never
 * filtered by unit or by whether a limit was configured.
 */
export interface ReportMetric {
  /**
   * The severity of the worst limit this metric breached, if it breached one.
   *
   * One field for three states rather than a flag beside a severity, because
   * "breached, severity unknown" is not a state a metric can be in. `undefined`
   * is no breach, `"warn"` is advisory, `"fail"` stops the change.
   */
  breach: MetricSeverity | undefined;
  /**
   * True when the target's globs matched no files.
   *
   * Read straight off the report rather than inferred from a zero, because a
   * target that matched nothing clears every limit written against it while
   * measuring nothing at all — and a target that genuinely measures zero is a
   * different thing entirely.
   */
  empty: boolean;
  /** What the row is called in the table: the written label, else its target. */
  label: string;
  /**
   * The enforced limit, absent where nothing limits the metric.
   *
   * The lowest `fail` limit when there is one, else the lowest `warn` limit.
   * An advisory limit sitting below it is carried by the row's breach severity
   * instead.
   */
  limit: number | undefined;
  /**
   * The metric's name, which is the key it joins to its baseline on.
   *
   * Stable by construction — codometer builds it from the target's name and the
   * metric's path within that target, both of which are written in the
   * configuration — so a metric present on both sides never reads as one
   * removal plus one addition.
   */
  name: string;
  /** What `value` is denominated in, so a renderer can format it correctly. */
  unit: MetricUnit;
  value: number;
}

/** One target's report, before its metrics are pulled out of it. */
export type ReportTarget = CodometerReport["targets"][number];
