// 🏷️ Types

import type { RunMode } from "@callidescope/configuration";
import type { CallGraphResult } from "@callidescope/core";

/** Arguments accepted when weighing what a run found. */
export interface ReportFindingsArguments {
  readonly mode: RunMode;
  readonly result: CallGraphResult;
  /**
   * Destinations found not to hold the current report. Only ever non-empty
   * when the run was comparing, since nothing else reads a destination.
   */
  readonly stalePaths: readonly string[];
}
