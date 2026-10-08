// 🏷️ Types

/** Result of comparing a Markdown file's anchor against freshly built content. */
export interface AnchorCheckResult {
  /** The content the anchor currently holds. */
  readonly currentContent: string;
  /** The content a fresh run would produce. */
  readonly freshContent: string;
  /** Whether the anchor already holds the fresh content. */
  readonly isCurrent: boolean;
}

/**
 * Which of the two things delivery does to a destination.
 *
 * Not the same thing as `RunMode`, which is what the command line asked the
 * whole run to do: a run gating `--check boundaries` alone reads no
 * destination at all, so it never reaches delivery and has no mode here.
 */
export type CodependixRunMode = "check" | "write";

/**
 * Every project's outcome from one graph-type pass — the projects that
 * finished, and the projects that failed before their exports could be
 * resolved.
 *
 * Kept apart rather than folded into one list: a caller deciding a run's exit
 * code needs both a stale export and a failed project to fail it, and a caller
 * only interested in what was actually written needs `results` alone.
 */
export interface GraphRunOutcome {
  failures: ProjectRunFailure[];
  results: ProjectRunResult[];
}

/**
 * Names the `## 🕸️ Codependix` section text a caller wants auto-created when
 * its anchored Markdown destination is missing.
 *
 * Carried as its own field on `DeliverGraphOutputArguments` rather than
 * folded into `ResolvedCodependixGraphOutput`: the section heading and intro
 * line are fixed per graph type, not something a workspace's configuration
 * file resolves, so they are supplied by `GraphRunService` at the call site
 * instead of flowing through configuration resolution.
 */
export interface MarkdownSectionArguments {
  introLine: string;
  /**
   * The `### <subheading>` placed above the anchor block, or `undefined` for
   * the workspace README, whose Workspace Graph anchor sits directly under
   * the `## 🕸️ Codependix` heading with no subheading of its own.
   */
  subheading: string | undefined;
}

/**
 * One project's outcome after it raised before its exports could be
 * resolved — a missing anchor, or a NestJS project that failed to boot its
 * container.
 *
 * Kept apart from `ProjectRunResult` rather than added to it as an optional
 * field: a result is either something that was resolved (current or stale) or
 * something that never got that far, and the two should not be representable
 * at once.
 */
export interface ProjectRunFailure {
  error: string;
  projectName: string;
}
// 🏷️ Types

/** One project's outcome after its configured destinations were resolved. */
export interface ProjectRunResult {
  isCurrent: boolean;
  projectName: string;
  staleExports: StaleExport[];
  stalePaths: string[];
}

/**
 * What the run does with the graphs it builds.
 *
 * The three are independent. Writing gates on `writes` alone, staleness on
 * `checksReports` alone, and a broken rule on `checksBoundaries` alone, so no
 * flag ever quietly turns another one on. That separation is the whole point
 * of the split: a stale export moves with the workspace and belongs on the
 * default branch, while a broken boundary is caused by the branch and belongs
 * on every pull request.
 */
export interface RunMode {
  readonly checksBoundaries: boolean;
  readonly checksReports: boolean;
  readonly writes: boolean;
}

/**
 * What the command line asked the run to do, and what it could not make sense of.
 *
 * Every complaint is collected before any of them is reported, so a command
 * line with two mistakes in it is two mistakes to fix rather than two runs.
 */
export interface RunModeSelection {
  readonly errors: readonly string[];
  readonly mode: RunMode;
}

/** One destination that no longer holds what a fresh export would produce. */
export interface StaleExport {
  /** The anchor name if the destination is an anchored Markdown block, or undefined. */
  readonly anchor?: string | undefined;
  /** What differs between the current destination and the fresh export: "graph" or "formatting". */
  readonly difference: StaleExportDifference;
  /** The relative destination path (e.g. "README.md", "codependix-nx-graph.json"). */
  readonly path: string;
}

/** What differs between the current destination and the fresh export. */
export type StaleExportDifference = "formatting" | "graph";
