import { appendFileSync } from "node:fs";

import { Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";

import { LoggerService } from "@codebase/logging";

import { PullRequestReleaseSignificanceGithubService } from "./pull-request-release-significance-github.service";
import {
  PULL_REQUEST_NUMBER_PATTERN,
  STEP_SUMMARY_FAILURE_MESSAGE,
  STEP_SUMMARY_VARIABLE,
  USAGE_LINES,
} from "./pull-request-release-significance.constants";
import { PullRequestReleaseSignificanceService } from "./pull-request-release-significance.service";

import type {
  ConventionalSubject,
  PullRequestCommitsResolution,
} from "./pull-request-release-significance.types";

/**
 * CLI command that checks a pull request's title against its own commits.
 *
 * A squash-merged pull request's title is the only thing semantic-release
 * ever sees; the commits behind it are discarded the moment they are
 * squashed away. This command reads both, ranks each against
 * `release.config.cjs`'s `releaseRules`, and fails when the title's own type
 * is less release-significant than its most significant commit, or when the
 * title shares no scope overlap with a commit.
 *
 * Always run live, through `gh pr view <number> --json title,commits` —
 * unlike pull-request-metadata there is no workflow-mode env-var path,
 * because the `pull_request` webhook payload never carries a pull request's
 * full commit list, so a `gh` call is unavoidable either way.
 *
 * Every failure is reported rather than only the first, and the whole report
 * is mirrored to `GITHUB_STEP_SUMMARY` when it is set. Exits 0 when the title
 * is significant enough and 1 when any check fails or the input cannot be
 * used, and never anything else.
 */
@Command({
  description:
    "Check that a pull request's title is at least as release-significant as its commits, and shares a scope with them",
  name: "pull-request-release-significance",
})
@Injectable()
export class PullRequestReleaseSignificanceCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly pullRequestReleaseSignificanceGithubService: PullRequestReleaseSignificanceGithubService,
    private readonly pullRequestReleaseSignificanceService: PullRequestReleaseSignificanceService,
  ) {
    super();
    this.logger.setContext(PullRequestReleaseSignificanceCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Echoes one report line and keeps it for the step summary. */
  private appendToReport(reportLines: string[], reportLine: string): void {
    reportLines.push(reportLine);
    console.info(reportLine);
  }

  /** Reports one line, mirrors the report, and exits non-zero. */
  private failWithMessage(reportLines: string[], failure: string): never {
    this.appendToReport(reportLines, failure);
    this.mirrorToStepSummary(reportLines);

    return process.exit(1);
  }

  /** Reports one line, then how to invoke this check, and exits non-zero. */
  private failWithUsageError(reportLines: string[], failure: string): never {
    this.appendToReport(reportLines, failure);
    this.appendToReport(reportLines, "");

    for (const usageLine of USAGE_LINES) {
      this.appendToReport(reportLines, usageLine);
    }

    this.mirrorToStepSummary(reportLines);

    return process.exit(1);
  }

  /** Mirrors the report into the GitHub Actions step summary, if there is one. */
  private mirrorToStepSummary(reportLines: readonly string[]): void {
    const summaryPath = process.env[STEP_SUMMARY_VARIABLE];

    if (summaryPath === undefined || summaryPath === "") {
      return;
    }

    if (reportLines.length === 0) {
      return;
    }

    try {
      appendFileSync(summaryPath, `${reportLines.join("\n")}\n`, "utf8");
    } catch {
      console.warn(STEP_SUMMARY_FAILURE_MESSAGE);
    }
  }

  /** Reads the pull request's title and commits live, through `gh pr view`. */
  private readLivePullRequest(
    reportLines: string[],
    pullRequestNumber: string,
  ): PullRequestCommitsResolution {
    if (!this.pullRequestReleaseSignificanceGithubService.isAvailable()) {
      this.failWithUsageError(
        reportLines,
        `❌ Unable to read pull request ${pullRequestNumber}: gh is not available`,
      );
    }

    const view = this.pullRequestReleaseSignificanceGithubService.run([
      "pr",
      "view",
      pullRequestNumber,
      "--json",
      "title,commits",
    ]);

    if (!view.succeeded) {
      this.failWithUsageError(
        reportLines,
        `❌ Unable to read pull request ${pullRequestNumber}: gh pr view failed (${this.pullRequestReleaseSignificanceGithubService.describeFailure(view)})`,
      );
    }

    return this.pullRequestReleaseSignificanceService.resolveFromDocument(
      view.standardOutput,
    );
  }

  /** Prints the collected failures. */
  private reportFailures(
    reportLines: string[],
    failures: readonly string[],
  ): never {
    this.appendToReport(
      reportLines,
      "❌ Pull request title is not release-significant enough",
    );
    this.appendToReport(reportLines, "");

    for (const failure of failures) {
      this.appendToReport(reportLines, `- ${failure}`);
    }

    this.mirrorToStepSummary(reportLines);

    return process.exit(1);
  }

  /**
   * The pull request number this run checks, from the argument or the
   * environment.
   *
   * Required rather than defaulted: unlike pull-request-metadata's
   * remediation labels, there is nothing this check can fall back to
   * printing without one.
   */
  private resolvePullRequestNumber(
    reportLines: string[],
    passedParameters: string[],
  ): string {
    if (passedParameters.length > 1) {
      this.failWithUsageError(
        reportLines,
        "❌ Expected at most one argument, the pull request number",
      );
    }

    const argument = passedParameters[0];

    if (argument !== undefined) {
      if (!PULL_REQUEST_NUMBER_PATTERN.test(argument)) {
        this.failWithUsageError(
          reportLines,
          `❌ Not a pull request number: ${argument}`,
        );
      }

      return argument;
    }

    const fromEnvironment = process.env["PULL_REQUEST_NUMBER"] ?? "";

    if (fromEnvironment === "") {
      this.failWithUsageError(
        reportLines,
        "❌ Expected a pull request number, or PULL_REQUEST_NUMBER in the environment",
      );
    }

    return fromEnvironment;
  }

  // 🌎 Public Methods

  /** Checks the pull request's title against its commits and exits 0 or 1. */
  public async run(passedParameters: string[]): Promise<void> {
    // Nothing here is asynchronous; the base class signature is.
    await Promise.resolve();

    const reportLines: string[] = [];
    const pullRequestNumber = this.resolvePullRequestNumber(
      reportLines,
      passedParameters,
    );
    const resolution = this.readLivePullRequest(reportLines, pullRequestNumber);

    if (!resolution.resolved) {
      this.failWithMessage(reportLines, resolution.failure);
    }

    const titleConvention: ConventionalSubject | undefined =
      this.pullRequestReleaseSignificanceService.parseConventionalSubject(
        resolution.title,
      );

    if (titleConvention === undefined) {
      this.failWithMessage(
        reportLines,
        `❌ Unable to parse type and scope from title: ${resolution.title}`,
      );
    }

    const releaseRules =
      this.pullRequestReleaseSignificanceService.readReleaseRules();
    const verdict =
      this.pullRequestReleaseSignificanceService.checkSignificance({
        commits: resolution.commits,
        releaseRules,
        titleConvention,
      });

    if (verdict.failures.length > 0) {
      this.reportFailures(reportLines, verdict.failures);
    }

    this.appendToReport(
      reportLines,
      "✅ Pull request title is release-significant enough for its commits",
    );
    this.mirrorToStepSummary(reportLines);
  }
}
