// 🏷️ Types

/** One label the conventional vocabulary says this repository must carry. */
export interface ConventionalLabel {
  /** Six hexadecimal digits, no leading `#`, as `gh label` writes them. */
  readonly color: string;
  readonly description: string;
  readonly name: string;
}

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
 * What one reconciliation would do, decided before any of it is done.
 *
 * Creations and updates are kept apart from the stale names because the two
 * halves have opposite standing: the first two are acted on, and the third is
 * only ever reported. Nothing here deletes a label.
 */
export interface LabelReconciliationPlan {
  readonly creations: readonly ConventionalLabel[];
  /**
   * Existing `type:`, `scope:`, or `source:` labels the configuration no
   * longer names, so the repository owner can review them by hand.
   */
  readonly staleNames: readonly string[];
  readonly updates: readonly ConventionalLabel[];
}
