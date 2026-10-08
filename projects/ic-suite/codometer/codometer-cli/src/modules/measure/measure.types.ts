// 🏷️ Types

import type {
  MeasureFormat,
  ResolvedCodometerConfiguration,
  RunMode,
} from "@codometer/configuration";
import type { MeasurementResult } from "@codometer/measurement";
import type {
  ResolvedMarkdownDestination,
  RunDestinations,
} from "@codometer/output";

/** Arguments accepted when weighing what a run found. */
export interface ReportFindingsArguments {
  measurement: MeasurementResult;
  mode: RunMode;
  /** Destinations found not to hold the current output. Only ever non-empty
   * when the run was comparing, since nothing else reads a destination. */
  stalePaths: string[];
}

/**
 * Everything a run needs once its command line has been made sense of: the
 * resolved configuration, what to print, where each output goes, and what
 * the run does with what it measures.
 */
export interface RunPlan {
  configuration: ResolvedCodometerConfiguration;
  /** Where the console's own badge block comes from, resolved independently
   * of `destinations.markdown` so it never depends on which `--output-*` flag
   * was passed. */
  consoleMarkdown: ResolvedMarkdownDestination | undefined;
  destinations: RunDestinations;
  format: MeasureFormat | undefined;
  mode: RunMode;
}
