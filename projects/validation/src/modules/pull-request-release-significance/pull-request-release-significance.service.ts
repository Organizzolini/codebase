import { createRequire } from "node:module";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import {
  BREAKING_CHANGE_FOOTER_PATTERN,
  COMMIT_ANALYZER_PLUGIN_NAME,
  commitAnalyzerOptionsSchema,
  CONVENTIONAL_SUBJECT_PATTERN,
  pullRequestDocumentSchema,
  RELEASE_CONFIG_PATH,
  RELEASE_LEVEL_RANK,
  releaseConfigSchema,
  SUBJECT_SCOPE_SEPARATOR_PATTERN,
} from "./pull-request-release-significance.constants";

import type {
  ConventionalSubject,
  PullRequestCommit,
  PullRequestCommitsResolution,
  ReleaseRule,
  SignificanceVerdict,
} from "./pull-request-release-significance.types";

/**
 * Reads a pull request's title and commits and says whether the title is at
 * least as release-significant as every commit behind it.
 *
 * Pure throughout except for `readReleaseRules`, which is the one method
 * that touches the filesystem — reading `release.config.cjs` fresh on every
 * run rather than duplicating its `releaseRules` here, so the two cannot
 * drift apart. Reading the pull request itself from GitHub is the command's
 * job, not this one's.
 */
@Injectable()
export class PullRequestReleaseSignificanceService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  private readonly requireFromCurrentModule = createRequire(import.meta.url);

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Every missing-scope failure, one line per scope across all commits. */
  private describeMissingScopeFailures(
    missingScopeCommits: ReadonlyMap<string, readonly string[]>,
  ): string[] {
    return [...missingScopeCommits.entries()].map(
      ([scope, shas]) =>
        `❌ Scope "${scope}" is used in commit${shas.length > 1 ? "s" : ""} ${shas.join(", ")} but missing from the title`,
    );
  }

  /** The one failure line for a title that understates its most significant commit. */
  private describeSignificanceFailure(
    mostSignificantCommit: { commit: PullRequestCommit; rank: number },
    releaseRules: readonly ReleaseRule[],
  ): string {
    const level = this.releaseLevelName(mostSignificantCommit.rank);
    const example = releaseRules.find(
      (rule) => rule.type !== undefined && rule.release === level,
    )?.type;

    return (
      `❌ Commit ${mostSignificantCommit.commit.sha} (${mostSignificantCommit.commit.subject}) ` +
      `needs a title of at least ${level} significance (e.g. ${example ?? level}): retitle with a more significant type`
    );
  }

  /**
   * Every scope that a commit used without any scope overlap in the title,
   * grouped by scope and commit SHA.
   *
   * A title counts as scoping a commit when at least one of the commit's
   * scopes also appears in the title; there is no requirement that the title
   * name every scope the branch used.
   */
  private findMissingScopes(
    commits: readonly PullRequestCommit[],
    titleConvention: ConventionalSubject,
  ): Map<string, string[]> {
    const missingScopeCommits = new Map<string, string[]>();

    for (const commit of commits) {
      if (commit.convention === undefined) {
        continue;
      }

      const overlapsTitle = commit.convention.scopes.some((scope) =>
        titleConvention.scopes.includes(scope),
      );

      if (overlapsTitle) {
        continue;
      }

      for (const scope of commit.convention.scopes) {
        const shas = missingScopeCommits.get(scope) ?? [];
        shas.push(commit.sha);
        missingScopeCommits.set(scope, shas);
      }
    }

    return missingScopeCommits;
  }

  /** The commit whose own type and scopes rank most release-significant. */
  private findMostSignificantCommit(
    commits: readonly PullRequestCommit[],
    releaseRules: readonly ReleaseRule[],
  ): undefined | { commit: PullRequestCommit; rank: number } {
    let mostSignificant:
      | undefined
      | { commit: PullRequestCommit; rank: number };

    for (const commit of commits) {
      if (commit.convention === undefined) {
        continue;
      }

      const rank = this.significanceRank(commit.convention, releaseRules);

      if (mostSignificant === undefined || rank > mostSignificant.rank) {
        mostSignificant = { commit, rank };
      }
    }

    return mostSignificant;
  }

  /** Whether this value can be read by property name at all. */
  private isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object";
  }

  /**
   * The first `releaseRules` entry this subject satisfies, in array order.
   *
   * First match rather than best match, mirroring exactly how
   * `@semantic-release/commit-analyzer` itself resolves one commit against
   * the array: a rule matches when every key it declares is satisfied, and
   * the first rule to do so wins regardless of what a later rule might also
   * match.
   */
  private matchRule(
    subject: ConventionalSubject,
    releaseRules: readonly ReleaseRule[],
  ): ReleaseRule | undefined {
    return releaseRules.find((rule) => this.ruleMatches(rule, subject));
  }

  /** The numeric rank a release level carries, `false` lowest. */
  private rankOfRelease(release: ReleaseRule["release"]): number {
    return release === false ? 0 : (RELEASE_LEVEL_RANK[release] ?? 0);
  }

  /** Reads one raw `commits` array entry into a `PullRequestCommit`. */
  private readRawCommit(entry: unknown): PullRequestCommit {
    const record = this.isRecord(entry) ? entry : {};
    const subject =
      typeof record["messageHeadline"] === "string"
        ? record["messageHeadline"]
        : "";
    const body =
      typeof record["messageBody"] === "string" ? record["messageBody"] : "";
    const sha =
      typeof record["oid"] === "string" ? record["oid"].slice(0, 7) : "";

    return {
      convention: this.parseConventionalSubject(subject, body),
      sha,
      subject,
    };
  }

  /** The release level name this rank came from, for a report line. */
  private releaseLevelName(rank: number): string {
    const entry = Object.entries(RELEASE_LEVEL_RANK).find(
      ([, levelRank]) => levelRank === rank,
    );

    return entry?.[0] ?? "release-significant";
  }

  /** Whether every key this rule declares agrees with the subject. */
  private ruleMatches(
    rule: ReleaseRule,
    subject: ConventionalSubject,
  ): boolean {
    return (
      (rule.breaking === undefined || rule.breaking === subject.breaking) &&
      (rule.revert === undefined ||
        rule.revert === (subject.type === "revert")) &&
      (rule.type === undefined || rule.type === subject.type) &&
      (rule.scope === undefined || subject.scopes.includes(rule.scope))
    );
  }

  // 🌎 Public Methods

  /**
   * Every way this pull request's title understates its own commits.
   *
   * Two independent comparisons, both against the title alone rather than
   * against each other: the most release-significant commit sets the floor
   * the title's own type must clear, and the title must share at least one
   * scope with each commit it is checked against.
   */
  public checkSignificance(options: {
    readonly commits: readonly PullRequestCommit[];
    readonly releaseRules: readonly ReleaseRule[];
    readonly titleConvention: ConventionalSubject;
  }): SignificanceVerdict {
    const { commits, releaseRules, titleConvention } = options;
    const titleRank = this.significanceRank(titleConvention, releaseRules);
    const mostSignificantCommit = this.findMostSignificantCommit(
      commits,
      releaseRules,
    );
    const missingScopeCommits = this.findMissingScopes(
      commits,
      titleConvention,
    );
    const failures: string[] = [];

    if (
      mostSignificantCommit !== undefined &&
      mostSignificantCommit.rank > titleRank
    ) {
      failures.push(
        this.describeSignificanceFailure(mostSignificantCommit, releaseRules),
      );
    }

    failures.push(...this.describeMissingScopeFailures(missingScopeCommits));

    return { failures };
  }

  /** Whatever went wrong, as the one line a report can carry. */
  public describeError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  /**
   * Reads the type, scopes, and breaking marker out of a conventional
   * subject line.
   *
   * A subject that does not parse at all returns `undefined`. The breaking
   * marker is true when either the subject itself carries `!` or the body
   * carries a `BREAKING CHANGE:` footer — the same two signals
   * `@semantic-release/commit-analyzer` reads.
   */
  public parseConventionalSubject(
    subject: string,
    body = "",
  ): ConventionalSubject | undefined {
    const match = CONVENTIONAL_SUBJECT_PATTERN.exec(subject.trim());
    const type = match?.[1];

    if (match === null || type === undefined) {
      return undefined;
    }

    const scopes = [
      ...new Set(
        (match[2] ?? "")
          .split(SUBJECT_SCOPE_SEPARATOR_PATTERN)
          .map((scope) => scope.trim().toLowerCase())
          .filter((scope) => scope !== ""),
      ),
    ];

    const breaking =
      match.groups?.["breaking"] === "!" ||
      BREAKING_CHANGE_FOOTER_PATTERN.test(body);

    return { breaking, scopes, type };
  }

  /**
   * Reads `release.config.cjs`'s `releaseRules`, wherever `cwd` is.
   *
   * Throws when the commit-analyzer plugin is missing or malformed: that is
   * a broken repository invariant this check depends on, not a pull request
   * to report on.
   */
  public readReleaseRules(): ReleaseRule[] {
    const configPath = path.join(process.cwd(), RELEASE_CONFIG_PATH);
    const config = releaseConfigSchema.parse(
      this.requireFromCurrentModule(configPath) as unknown,
    );

    const commitAnalyzerEntry = config.plugins.find(
      (plugin): plugin is [string, unknown] =>
        Array.isArray(plugin) && plugin[0] === COMMIT_ANALYZER_PLUGIN_NAME,
    );

    if (commitAnalyzerEntry === undefined) {
      throw new Error(
        `❌ ${RELEASE_CONFIG_PATH} has no ${COMMIT_ANALYZER_PLUGIN_NAME} plugin`,
      );
    }

    return commitAnalyzerOptionsSchema.parse(commitAnalyzerEntry[1])
      .releaseRules;
  }

  /** Reads the title and commits out of a `gh pr view` document. */
  public resolveFromDocument(
    documentText: string,
  ): PullRequestCommitsResolution {
    let parsed: unknown;

    try {
      parsed = JSON.parse(documentText);
    } catch (error) {
      return {
        failure: `❌ Unable to parse the gh pr view output: ${this.describeError(error)}`,
        resolved: false,
      };
    }

    const result = pullRequestDocumentSchema.safeParse(parsed);
    const document = result.success ? result.data : {};
    const rawCommits = document.commits ?? [];

    return {
      commits: rawCommits.map((entry) => this.readRawCommit(entry)),
      resolved: true,
      title: document.title ?? "",
    };
  }

  /** How release-significant this subject is, under these `releaseRules`. */
  public significanceRank(
    subject: ConventionalSubject,
    releaseRules: readonly ReleaseRule[],
  ): number {
    const rule = this.matchRule(subject, releaseRules);

    return rule === undefined ? 0 : this.rankOfRelease(rule.release);
  }
}
