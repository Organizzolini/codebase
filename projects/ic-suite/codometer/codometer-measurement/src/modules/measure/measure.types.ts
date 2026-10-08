// 🏷️ Types

import type { DiscoveryResult } from "../discovery/discovery.types";
import type { EvaluatedLimit, TargetMetricIndex } from "../limits/limits.types";
import type { SizeResult } from "../size/size.types";
import type {
  ResolvedCodometerConfiguration,
  ResolvedCodometerCustomStatistic,
  ResolvedCodometerInput,
} from "@codometer/configuration";
import type { CodeStatisticsResult, ReportFailure } from "@codometer/core";
import type {
  CommentCounter,
  TypescriptSymbolCounter,
} from "@codometer/languages";

/**
 * Arguments accepted when running every analyzer over one set of files.
 */
export interface AnalyzeFilesArguments {
  commentCounters: CommentCounter[];
  configuration: ResolvedCodometerConfiguration;
  discoveredFiles: DiscoveryResult;
  statistics: ResolvedCodometerCustomStatistic[];
  symbolCounters: TypescriptSymbolCounter[];
  workingDirectory: string;
}

/**
 * What every analysis declared for one input reported over its files.
 *
 * An analysis an input did not ask for reports `undefined` rather than a zero,
 * so an input nobody measured the size of is never mistaken for an empty one.
 */
export interface InputMeasurement {
  /** How many files the input's globs claimed. */
  files: number;
  language: CodeStatisticsResult | undefined;
  name: string;
  size: SizeResult | undefined;
}

/**
 * Arguments accepted by the measurement pipeline.
 */
export interface MeasureArguments {
  configuration: ResolvedCodometerConfiguration;
  /**
   * Files codometer writes itself, relative to the measured directory.
   *
   * Never measured, whether or not this particular run writes them: a run that
   * measured a different tree depending on its flags could not tell a stale
   * report from a report written by a differently-flagged run.
   */
  outputPaths: readonly string[];
  workingDirectory: string;
}

/**
 * Arguments accepted when measuring one declared input.
 */
export interface MeasureInputArguments {
  commentCounters: CommentCounter[];
  configuration: ResolvedCodometerConfiguration;
  input: ResolvedCodometerInput;
  outputPaths: readonly string[];
  statistics: ResolvedCodometerCustomStatistic[];
  symbolCounters: TypescriptSymbolCounter[];
  workingDirectory: string;
}

/**
 * Everything one run measured, input by input.
 *
 * `statistics` is the `codebase` input's own language metrics, which is the
 * report every consumer renders today. It is the same object that input
 * carries, held out separately so nothing downstream has to know which input
 * it came from.
 */
export interface MeasurementResult {
  /**
   * Whatever the run could not do, collected rather than thrown.
   *
   * An input that will not measure and a limit that binds to nothing are both
   * recorded here and stepped over, so one run names every one of them instead
   * of stopping at the first and hiding the rest behind it.
   */
  failures: ReportFailure[];
  /** Every metric each measured input counted, addressable by dotted path. */
  indexes: Map<string, TargetMetricIndex>;
  /** Every input measured, in the order `inputs` declared them. */
  inputs: InputMeasurement[];
  /**
   * What every declared limit found, in the order they were declared.
   *
   * Empty when nothing declared one, which is the ordinary case: a metric with
   * no limit is measured and reported like every other, and gated by nothing.
   */
  limits: EvaluatedLimit[];
  statistics: CodeStatisticsResult;
}
