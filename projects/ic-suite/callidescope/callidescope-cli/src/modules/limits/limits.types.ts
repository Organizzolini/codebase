// 🏷️ Types

/** Which of the two gated limits a row resolves. */
export type LimitName = "maximumBreadth" | "maximumDepth";

/** Options the `limits` command accepts. */
export interface LimitsCommandOptions {
  readonly config?: string | undefined;
}

/** One project's resolution of one limit, and the file the number came from. */
export interface ProjectLimitRow {
  readonly limit: LimitName;
  /**
   * Workspace-relative file the number is written in.
   *
   * Relative rather than absolute because the listing is read against a
   * checkout, and an absolute path says where somebody else's machine keeps
   * this repository. Absent only on the workspace's own row when no file wrote
   * the number down — every project's number is written in that project's own
   * file, or the run refused to start.
   */
  readonly path: string | undefined;
  /** Workspace-relative project root, absent on the workspace's own row. */
  readonly project: string | undefined;
  /** Absent when the project declared no limit of this name. */
  readonly value: number | undefined;
}
