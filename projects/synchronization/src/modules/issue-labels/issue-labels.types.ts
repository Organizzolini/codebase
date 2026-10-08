// 🏷️ Types

/**
 * What one `gh` invocation produced.
 *
 * Standard output and standard error are kept apart rather than merged. `gh`
 * writes its own notices — a new-release announcement, for one — to standard
 * error even when the call succeeds, so a merged stream leaves a successful
 * call returning a document that no longer parses as JSON.
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

/**
 * The Type and Scope answers read out of an `issue.yml` submission, when the
 * issue's body carries them.
 */
export interface IssueFormAnswers {
  readonly scope?: string;
  readonly type?: string;
}
