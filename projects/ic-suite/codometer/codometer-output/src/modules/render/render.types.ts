// 🏷️ Types

import type { MetricRow, ProjectFailure } from "../changes/changes.types";

/** Arguments for rendering the whole section. */
export interface RenderSectionArguments {
  /** Run the baseline came from, linked from the comparison line. */
  baselineUrl: string | undefined;
  /** What this run could not measure, so an absent row is never silent. */
  failures: readonly ProjectFailure[];
  rows: readonly MetricRow[];
}
