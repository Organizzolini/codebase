// 🏷️ Types

import type { ResolvedCodometerCustomStatistic } from "@codometer/configuration";
import type { CommentMeasurement } from "@codometer/languages";

/** Input to the custom statistics step. */
export interface CustomizationInput {
  /**
   * Every `comment`-selector counter's own measurements, keyed by its
   * statistic's label.
   *
   * Built by measuring the counters `buildCommentCounters` returns, then
   * merging the two results back together by label — the languages package
   * measures a counter naming a declaration kind and one naming a language
   * through two different calls, but a label belongs to exactly one custom
   * statistic either way.
   */
  commentCounts: Record<string, CommentMeasurement[]>;
  /** Every file of the target being counted over. */
  files: string[];
  statistics: ResolvedCodometerCustomStatistic[];
  /** What the TypeScript analyzer tallied, keyed by counter label. */
  symbolCounts: Record<string, number>;
}
