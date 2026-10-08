// 🏷️ Types

/** What one conventional subject line — a commit's or the title's — declares. */
export interface ConventionalSubject {
  readonly breaking: boolean;
  /** Trimmed, lowercased, and de-duplicated; empty when the subject named none. */
  readonly scopes: readonly string[];
  readonly type: string;
}

/**
 * What one `gh` invocation produced.
 *
 * Standard output and standard error are kept apart rather than merged. `gh`
 * writes its own notices to standard error even when the call succeeds, so a
 * merged stream leaves a successful call returning a document that no longer
 * parses as JSON.
 */
export interface GithubCliResult {
  /** Whether the `gh` binary could be executed at all. */
  readonly available: boolean;
  readonly standardError: string;
  readonly standardOutput: string;
  readonly succeeded: boolean;
}

/**
 * One commit reachable from the pull request, alongside what it parsed to.
 *
 * `convention` is `undefined` for a subject that does not parse as
 * conventional at all — a merge commit, say — which this check skips rather
 * than fails on, since such a commit carries no significance signal either
 * way.
 */
export interface PullRequestCommit {
  readonly convention: ConventionalSubject | undefined;
  readonly sha: string;
  readonly subject: string;
}

/**
 * Either the pull request's title and commits, or the one line saying why
 * there are none.
 */
export type PullRequestCommitsResolution =
  | {
      readonly commits: readonly PullRequestCommit[];
      readonly resolved: true;
      readonly title: string;
    }
  | { readonly failure: string; readonly resolved: false };

/**
 * One entry of `release.config.cjs`'s `releaseRules`, as much as this check
 * reads.
 */
export interface ReleaseRule {
  readonly breaking?: boolean | undefined;
  readonly release: "major" | "minor" | "patch" | false;
  readonly revert?: boolean | undefined;
  readonly scope?: string | undefined;
  readonly type?: string | undefined;
}

/** Every way one pull request's title understates its own commits. */
export interface SignificanceVerdict {
  readonly failures: readonly string[];
}
