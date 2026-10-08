// 🏷️ Types

import type { SizeResult } from "../size/size.types";
import type { ResolvedCodometerConfiguration } from "@codometer/configuration";
import type {
  CodeStatisticsResult,
  CodometerSeverity,
  CustomStatisticResultInstance,
} from "@codometer/core";

/** Arguments accepted when recording one metric within one target's index. */
export interface AddMetricArguments {
  index: TargetMetricIndex;
  /** Set only by a per-instance selector — a `comment` selector today. */
  instances?: CustomStatisticResultInstance[] | undefined;
  metricPath: string;
  value: number;
}

/** Arguments accepted when binding one metric path within one target. */
export interface BindMetricArguments {
  index: TargetMetricIndex;
  /** The path with the target's name already taken off it. */
  metricPath: string;
  /** The path as the limit was written, for an error that has to quote it. */
  path: string;
  target: string;
}

/** A target name that answered to more than one measured target. */
export interface DuplicateTargetFinding {
  reason: string;
  target: string;
}

/**
 * What one limit found once it was pointed at its metric.
 *
 * A breach is one of these carrying `breached`, and it reports everything a
 * breach has to: which metric, held to what, and what the metric actually
 * measured. A limit that held is reported the same way, so a report can show
 * the headroom rather than only the failures.
 */
export interface EvaluatedLimit {
  /** Whether the measured value came out above the limit. */
  breached: boolean;
  /** Stays `undefined` when none was written; a report falls back to the path. */
  label: string | undefined;
  limit: number;
  measured: number;
  /** The metric's path within its target, with no target name on the front. */
  metric: string;
  severity: CodometerSeverity;
  target: string;
}

/** Arguments accepted when evaluating every declared limit. */
export interface EvaluateLimitsArguments {
  configuration: ResolvedCodometerConfiguration;
  indexes: ReadonlyMap<string, TargetMetricIndex>;
}

/**
 * One limit that could not be held against anything.
 *
 * Collected rather than thrown. A configuration carrying three limits that
 * bind to nothing is three mistakes to fix, and reporting only the first turns
 * one repair into three runs.
 */
export interface LimitFailure {
  /** The dotted path exactly as the limit was written. */
  metric: string;
  reason: string;
}

/**
 * What every declared limit found, alongside the ones that bound to nothing.
 *
 * Both lists are always present. A limit that could not be bound is neither a
 * breach nor a pass, and reporting it as either would be a gate whose verdict
 * nobody could trust.
 */
export interface LimitsEvaluation {
  failures: LimitFailure[];
  limits: EvaluatedLimit[];
}

/**
 * What one target measured, as the limits layer reads it.
 *
 * Declared here rather than imported from the measurement pipeline: gating a
 * number needs the number and its target's name, and nothing about how either
 * was produced.
 */
export interface MeasuredTarget {
  files: number;
  language: CodeStatisticsResult | undefined;
  name: string;
  size: SizeResult | undefined;
}

/** Where a limit's path landed, and what the metric there measured. */
export interface MetricBinding {
  /**
   * How many files the bound target held.
   *
   * Carried along because a limit on a target that matched nothing is an
   * error, and the count is the only way to tell that apart from a target
   * that genuinely measured zero.
   */
  files: number;
  measured: number;
  metric: string;
  target: string;
}

/** Every measured target's metrics, and the names two targets fought over. */
export interface MetricIndexResult {
  /** Collisions found while indexing, in the order they were found. */
  duplicates: DuplicateTargetFinding[];
  indexes: Map<string, TargetMetricIndex>;
}

/** Arguments accepted when resolving one limit's path to a single metric. */
export interface ResolveMetricArguments {
  defaultInput: string | undefined;
  indexes: ReadonlyMap<string, TargetMetricIndex>;
  /** The dotted path exactly as the limit was written. */
  path: string;
}

/** Every metric one target measured, addressable by dotted path. */
export interface TargetMetricIndex {
  /**
   * Paths more than one metric answers to, which no limit may address.
   *
   * Two configured counters sharing a label is the way this happens. Either
   * metric would be a defensible binding, which is exactly why neither is.
   */
  ambiguous: Set<string>;
  files: number;
  /**
   * Where each metric's per-instance measurements were found, keyed by the
   * same dotted path `metrics` uses.
   *
   * Only a metric a per-instance selector produced has an entry here — a
   * `comment` selector today, and any future selector that measures more
   * than a count. A metric with no entry counted matches and nothing more,
   * so a consumer reading this map can tell the two apart without reading
   * the configuration that produced either.
   */
  instances: Map<string, CustomStatisticResultInstance[]>;
  metrics: Map<string, number>;
}
