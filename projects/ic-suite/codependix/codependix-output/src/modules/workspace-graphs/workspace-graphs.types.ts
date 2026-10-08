// 🏷️ Types

import type { CombinedGraphEntry } from "../graph-run/graph-run.types";
import type { ProjectRunResult } from "@codependix/core";

/** One whole-workspace graph pass's outcome. */
export interface WorkspaceGraphRunOutcome {
  /**
   * The graph's own data, for combined output — always populated when the
   * resolved workspace target is not `"none"`, regardless of whether that
   * target actually touches Markdown, so `--format`/`--json-output`/
   * `--markdown-output` can read a rendered diagram this run never wrote to a
   * configured destination.
   */
  entry: CombinedGraphEntry | undefined;
  /** The delivery outcome, or `undefined` when nothing was configured to deliver. */
  result: ProjectRunResult | undefined;
}
