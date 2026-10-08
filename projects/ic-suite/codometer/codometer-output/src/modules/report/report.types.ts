// 🏷️ Types

import type { ReportFailure } from "@codometer/core";
import type { EvaluatedLimit, TargetMetricIndex } from "@codometer/measurement";

/** Arguments accepted when building the report from one measurement. */
export interface BuildReportArguments {
  failures: readonly ReportFailure[];
  /** Every metric each measured target counted, target by target. */
  indexes: ReadonlyMap<string, TargetMetricIndex>;
  limits: readonly EvaluatedLimit[];
}
