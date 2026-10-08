// 🏷️ Types

/** Result of a bulk issues sweep. */
export interface BulkIssuesVerdict {
  readonly failureCount: number;
  readonly failures: readonly string[];
  readonly hierarchyViolations: readonly HierarchyViolation[];
  readonly totalIssues: number;
}

/**
 * What one `gh` invocation produced.
 *
 * Standard output and standard error are kept apart rather than merged. `gh`
 * writes its own notices — a new-release announcement, for one — to standard
 * error even when the call succeeds, so a merged stream leaves a successful
 * call returning a document that no longer parses as JSON. In a report that
 * is a false failure on a valid issue.
 */
export interface GithubCliResult {
  /**
   * Whether the `gh` binary could be executed at all.
   *
   * A missing binary is worth telling apart from a call that ran and failed:
   * one is an environment to fix, the other is an answer from GitHub.
   */
  readonly available: boolean;
  readonly standardError: string;
  readonly standardOutput: string;
  readonly succeeded: boolean;
}

/** The label families one issue's labels fall into. */
export interface GroupedLabels {
  readonly scopeLabels: readonly string[];
  readonly sourceLabels: readonly string[];
  readonly typeLabels: readonly string[];
}

/** A violation in issue hierarchy. */
export interface HierarchyViolation {
  readonly childNumber: number;
  readonly message: string;
  readonly parentNumber?: number;
}

/**
 * The Type and Scope answers read out of an `issue.yml` submission, when the
 * issue's body carries them.
 *
 * An issue opened through `gh issue create` or the API rather than the
 * template has neither, and that is a normal, expected shape rather than a
 * parse failure — it just means there is nothing in the body to compare
 * labels against.
 */
export interface IssueFormAnswers {
  readonly scope?: string;
  readonly type?: string;
}

/** The metadata one issue carries, whatever it was read from. */
export interface IssueMetadata {
  readonly body: string;
  readonly labelNames: readonly string[];
}

/**
 * Either the metadata, or the one line saying why there is none.
 *
 * A failure to read the input is reported the same way a failed check is, so
 * the command has one report path rather than two.
 */
export type IssueMetadataResolution =
  | { readonly failure: string; readonly resolved: false }
  | { readonly metadata: IssueMetadata; readonly resolved: true };

/** Summary representation of a GitHub issue from list API. */
export interface IssueSummary {
  readonly body: string;
  readonly labels: readonly { readonly name: string }[];
  readonly number: number;
  readonly title: string;
}

/** Result of listing open issues through gh CLI. */
export interface ListIssuesResult {
  readonly error?: string;
  readonly issues?: readonly IssueSummary[];
  readonly success: boolean;
}

/**
 * Everything wrong with one issue, and the commands that fix it.
 *
 * Both lists rather than a first failure: an issue with several problems is
 * several edits, and finding them one run at a time is several round trips
 * through a check that can fail its own workflow run but never the issue's
 * creation — the issue already exists by the time this runs.
 */
export interface MetadataVerdict {
  readonly failures: readonly string[];
  readonly remediationCommands: readonly string[];
}
