import { appendFileSync } from "node:fs";

import { Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";

import { LoggerService } from "@codebase/logging";

import { PullRequestMetadataGithubService } from "./pull-request-metadata-github.service";
import {
  PLACEHOLDER_PULL_REQUEST_NUMBER,
  PULL_REQUEST_NUMBER_PATTERN,
  STEP_SUMMARY_FAILURE_MESSAGE,
  STEP_SUMMARY_VARIABLE,
  USAGE_LINES,
} from "./pull-request-metadata.constants";
import { PullRequestMetadataService } from "./pull-request-metadata.service";

import type {
  PullRequestMetadataResolution,
  TitleConvention,
} from "./pull-request-metadata.types";

/**
 * CLI command that checks a pull request's labels and assignees against its
 * own title.
 *
 * Five things, all of them derived from the title rather than declared here:
 * exactly one `type:*` label equal to the title's type, exactly the `scope:*`
 * labels named by the title's scopes, no `do-not-merge` label, at least one
 * assignee, and exactly one `source:*` label declaring who opened it.
 *
 * Two input modes. Given a pull request number it reads the metadata live
 * through `gh pr view`, which is the local mode. Given none it reads
 * `PULL_REQUEST_TITLE`, `PULL_REQUEST_LABELS`, `PULL_REQUEST_ASSIGNEES`, and
 * `PULL_REQUEST_NUMBER` from the environment, which is the workflow mode: a
 * pure function of its inputs, needing no network, no token, and no write
 * permission.
 *
 * Every failure is reported rather than only the first, followed by the
 * `gh pr edit` commands that fix them, and the whole report is mirrored to
 * `GITHUB_STEP_SUMMARY` when it is set. Exits 0 when every check passes and 1
 * when any check fails or the input cannot be used, and never anything else.
 *
 * The report is carried through as an argument rather than held on the
 * instance, so one run's lines can never appear in another's.
 */
@Command({
  description:
    "Check that a pull request's labels and assignees agree with its title",
  name: "pull-request-metadata",
})
@Injectable()
export class PullRequestMetadataCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly pullRequestMetadataGithubService: PullRequestMetadataGithubService,
    private readonly pullRequestMetadataService: PullRequestMetadataService,
  ) {
    super();
    this.logger.setContext(PullRequestMetadataCommand.name);
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

  /**
   * Mirrors the report into the GitHub Actions step summary, if there is one.
   *
   * The report is a courtesy; the verdict is not. A full disk, or a summary
   * file that cannot be opened for appending, must never turn a passing pull
   * request into a failing one — so the write is guarded and its failure only
   * noted. Outside a workflow the variable is unset and this does nothing,
   * which is what keeps the command runnable from a terminal unchanged.
   */
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

  /**
   * Reads the metadata from the environment, the workflow mode.
   *
   * All three variables are required together: two of the three would leave
   * this check passing on metadata it never saw.
   */
  private readEnvironmentMetadata(
    reportLines: string[],
  ): PullRequestMetadataResolution {
    const title = process.env["PULL_REQUEST_TITLE"] ?? "";
    const labelsDocument = process.env["PULL_REQUEST_LABELS"] ?? "";
    const assigneesDocument = process.env["PULL_REQUEST_ASSIGNEES"] ?? "";

    if (title === "" || labelsDocument === "" || assigneesDocument === "") {
      this.failWithUsageError(
        reportLines,
        "❌ Expected a pull request number, or PULL_REQUEST_TITLE, PULL_REQUEST_LABELS, and PULL_REQUEST_ASSIGNEES in the environment",
      );
    }

    return this.pullRequestMetadataService.resolveFromEnvironment({
      assigneesDocument,
      labelsDocument,
      title,
    });
  }

  /** Reads the metadata live, through `gh pr view`. */
  private readLiveMetadata(
    reportLines: string[],
    pullRequestNumber: string,
  ): PullRequestMetadataResolution {
    if (!this.pullRequestMetadataGithubService.isAvailable()) {
      this.failWithUsageError(
        reportLines,
        `❌ Unable to read pull request ${pullRequestNumber}: gh is not available`,
      );
    }

    const view = this.pullRequestMetadataGithubService.run([
      "pr",
      "view",
      pullRequestNumber,
      "--json",
      "assignees,labels,title",
    ]);

    if (!view.succeeded) {
      this.failWithUsageError(
        reportLines,
        `❌ Unable to read pull request ${pullRequestNumber}: gh pr view failed (${this.pullRequestMetadataGithubService.describeFailure(view)})`,
      );
    }

    return this.pullRequestMetadataService.resolveFromDocument(
      view.standardOutput,
    );
  }

  /** Prints the collected failures and the commands that fix them. */
  private reportFailures(
    reportLines: string[],
    failures: readonly string[],
    remediationCommands: readonly string[],
  ): never {
    this.appendToReport(reportLines, "❌ Pull request metadata is invalid");
    this.appendToReport(reportLines, "");

    for (const failure of failures) {
      this.appendToReport(reportLines, `- ${failure}`);
    }

    if (remediationCommands.length > 0) {
      this.appendToReport(reportLines, "");
      this.appendToReport(reportLines, "🔧 Fix with:");
      this.appendToReport(reportLines, "");

      for (const remediationCommand of remediationCommands) {
        this.appendToReport(reportLines, `- ${remediationCommand}`);
      }
    }

    this.mirrorToStepSummary(reportLines);

    return process.exit(1);
  }

  /** Reads the metadata from wherever this invocation says it lives. */
  private resolveMetadata(
    reportLines: string[],
    passedParameters: string[],
  ): PullRequestMetadataResolution {
    if (passedParameters.length > 1) {
      this.failWithUsageError(
        reportLines,
        "❌ Expected at most one argument, the pull request number",
      );
    }

    const argument = passedParameters[0];

    if (argument === undefined) {
      return this.readEnvironmentMetadata(reportLines);
    }

    if (!PULL_REQUEST_NUMBER_PATTERN.test(argument)) {
      this.failWithUsageError(
        reportLines,
        `❌ Not a pull request number: ${argument}`,
      );
    }

    return this.readLiveMetadata(reportLines, argument);
  }

  /**
   * The number the remediation commands name.
   *
   * The workflow supplies `PULL_REQUEST_NUMBER`; without it the commands stay
   * printable by naming a placeholder rather than an empty string.
   */
  private resolvePullRequestNumber(passedParameters: string[]): string {
    const argument = passedParameters[0];

    if (argument !== undefined && PULL_REQUEST_NUMBER_PATTERN.test(argument)) {
      return argument;
    }

    const fromEnvironment = process.env["PULL_REQUEST_NUMBER"] ?? "";

    return fromEnvironment === ""
      ? PLACEHOLDER_PULL_REQUEST_NUMBER
      : fromEnvironment;
  }

  // 🌎 Public Methods

  /** Checks the pull request's metadata and exits 0 or 1 on the verdict. */
  public async run(passedParameters: string[]): Promise<void> {
    // Nothing here is asynchronous; the base class signature is.
    await Promise.resolve();

    const reportLines: string[] = [];
    const resolution = this.resolveMetadata(reportLines, passedParameters);

    if (!resolution.resolved) {
      this.failWithMessage(reportLines, resolution.failure);
    }

    const titleConvention: TitleConvention | undefined =
      this.pullRequestMetadataService.parseTitle(resolution.metadata.title);

    if (titleConvention === undefined) {
      this.failWithMessage(
        reportLines,
        `❌ Unable to parse type and scope from title: ${resolution.metadata.title}`,
      );
    }

    const verdict = this.pullRequestMetadataService.checkMetadata({
      metadata: resolution.metadata,
      pullRequestNumber: this.resolvePullRequestNumber(passedParameters),
      titleConvention,
    });

    if (verdict.failures.length > 0) {
      this.reportFailures(
        reportLines,
        verdict.failures,
        verdict.remediationCommands,
      );
    }

    this.appendToReport(reportLines, "✅ Pull request metadata is valid");
    this.mirrorToStepSummary(reportLines);
  }
}
