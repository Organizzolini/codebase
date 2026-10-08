// 🏷️ Types

/**
 * What one `gh` invocation produced.
 *
 * Standard output and standard error are kept apart rather than merged. `gh`
 * writes its own notices — a new-release announcement, for one — to standard
 * error even when the call succeeds, so a merged stream leaves a successful
 * call returning a document that no longer parses as JSON. In a blocking gate
 * that is a false failure on a valid pull request.
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

/** The label families one pull request's labels fall into. */
export interface GroupedLabels {
  readonly doNotMergePresent: boolean;
  readonly scopeLabels: readonly string[];
  readonly sourceLabels: readonly string[];
  readonly typeLabels: readonly string[];
}

/**
 * Everything wrong with one pull request, and the commands that fix it.
 *
 * Both lists rather than a first failure: a pull request with three problems
 * is three edits, and finding them one run at a time is three round trips
 * through a required check.
 */
export interface MetadataVerdict {
  readonly failures: readonly string[];
  readonly remediationCommands: readonly string[];
}

/** The metadata one pull request carries, whatever it was read from. */
export interface PullRequestMetadata {
  readonly assigneeLogins: readonly string[];
  readonly labelNames: readonly string[];
  readonly title: string;
}

/**
 * Either the metadata, or the one line saying why there is none.
 *
 * A failure to read the input is reported the same way a failed check is, so
 * the command has one report path rather than two.
 */
export type PullRequestMetadataResolution =
  | { readonly failure: string; readonly resolved: false }
  | { readonly metadata: PullRequestMetadata; readonly resolved: true };

/** What a conventional title declares about itself. */
export interface TitleConvention {
  /** Trimmed, lowercased, and de-duplicated; empty when the title named none. */
  readonly scopes: readonly string[];
  readonly type: string;
}
