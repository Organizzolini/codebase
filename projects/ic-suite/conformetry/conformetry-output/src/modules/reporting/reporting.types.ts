// 🏷️ Types

import type { InstanceScore, ValidationFileResult } from "@conformetry/core";

/** Arguments for rendering one instance/template location line. */
export interface FormatLocationArguments {
  readonly column: number | undefined;
  readonly jsonPath: string | undefined;
  readonly line: number | undefined;
  readonly prefix: string;
}

/** Arguments for rendering a full validation report. */
export interface FormatReportArguments {
  /** Failing files, already grouped by `PluginService` or `FilesService`. */
  readonly fileResults: ValidationFileResult[];
  /**
   * Per-instance scores to summarize above the findings.
   *
   * Optional so a caller with nothing to score — a single ad-hoc comparison —
   * still gets a report. Instances that scored perfectly are left out of the
   * summary: printing a full line for each would bury the ones that did not.
   */
  readonly scores?: InstanceScore[];
  /**
   * Directory that absolute paths are made relative to, so reports stay
   * readable and machine-independent. Passed in rather than discovered, since
   * this package deliberately has no workspace awareness.
   */
  readonly workingDirectory: string;
}
