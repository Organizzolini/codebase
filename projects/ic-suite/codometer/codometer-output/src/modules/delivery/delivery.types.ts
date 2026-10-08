// 🏷️ Types

import type {
  ResolvedMarkdownDestination,
  RunDestinations,
} from "../destinations/destinations.types";
import type { MeasurementScope } from "../markdown/markdown.types";
import type { MeasureFormat, RunMode } from "@codometer/configuration";
import type { CodometerReport } from "@codometer/core";
import type { MeasurementResult } from "@codometer/measurement";

/** Arguments accepted when producing every one of a run's outputs. */
export interface DeliverArguments {
  /** Where the printed badge block's own configured counters come from,
   * resolved independently of `destinations.markdown`. */
  consoleMarkdown: ResolvedMarkdownDestination | undefined;
  destinations: RunDestinations;
  /** What goes to standard output, or nothing when the run prints nothing. */
  format: MeasureFormat | undefined;
  measurement: MeasurementResult;
  mode: RunMode;
  report: CodometerReport;
  scope: MeasurementScope;
}
