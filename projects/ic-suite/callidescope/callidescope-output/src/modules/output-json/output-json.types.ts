// 🏷️ Types

import type { ResolvedCallidescopeJsonOutputConfiguration } from "@callidescope/configuration";
import type { CallGraphResult } from "@callidescope/core";

/** Arguments for rendering the JSON report. */
export interface BuildReportArguments {
  readonly destination: ResolvedCallidescopeJsonOutputConfiguration;
  readonly result: CallGraphResult;
}

/** Arguments for syncing the configured JSON destination. */
export interface SyncJsonArguments extends BuildReportArguments {
  readonly check: boolean;
}
