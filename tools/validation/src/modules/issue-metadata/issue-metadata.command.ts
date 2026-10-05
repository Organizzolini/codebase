import { appendFileSync } from "node:fs";

import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logging";

import { IssueMetadataGithubService } from "./issue-metadata-github.service";
import {
  ALL_ISSUES_FLAG,
  ALL_ISSUES_SHORT_FLAG,
  ISSUE_NUMBER_PATTERN,
  PLACEHOLDER_ISSUE_NUMBER,
  STEP_SUMMARY_FAILURE_MESSAGE,
  STEP_SUMMARY_VARIABLE,
  USAGE_LINES,
} from "./issue-metadata.constants";
import { IssueMetadataService } from "./issue-metadata.service";

import type { IssueMetadataResolution } from "./issue-metadata.types";

/**
 * CLI command that checks an issue's labels against its own body.
 *
 * An issue's title is free text with no enforced format, unlike a pull
 * request's — a quick backlog-idea title is a normal, intentional shape here
 * — so nothing here parses one. Instead it checks: exactly one `type:*`
 * label, matching the body's Type answer when `issue.yml` produced one; at
 * least one `scope:*` label, matching the body's Scope answer the same way;
 * and exactly one `source:*` label declaring who opened the issue. An issue
 * with no form markers in its body — every `source:agent` issue created
 * through `gh issue create` today — has nothing to compare the type and
 * scope labels against, so those two checks fall back to pure presence
 * rules.
 *
 * Two input modes. Given an issue number it reads the metadata live through
 * `gh issue view`, which is the local mode. Given none it reads `ISSUE_BODY`
 * and `ISSUE_LABELS` from the environment, which is the workflow mode: a
 * pure function of its inputs, needing no network, no token, and no write
 * permission.
 *
 * Every failure is reported rather than only the first, followed by the
 * `gh issue edit` commands that fix them, and the whole report is mirrored to
 * `GITHUB_STEP_SUMMARY` when it is set. Exits 0 when every check passes and 1
 * when any check fails or the input cannot be used — but GitHub has no way to
 * block an issue's creation the way it blocks a pull request's merge, so this
 * exit code only ever flags a problem; nothing enforces it.
 */
@Command({
  description: "Check that an issue's labels agree with its body",
  name: "issue-metadata",
})
@Injectable()
export class IssueMetadataCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly issueMetadataGithubService: IssueMetadataGithubService,
    private readonly issueMetadataService: IssueMetadataService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(IssueMetadataCommand.name);
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
   * file that cannot be opened for appending, must never turn a passing issue
   * into a failing one — so the write is guarded and its failure only noted.
   * Outside a workflow the variable is unset and this does nothing, which is
   * what keeps the command runnable from a terminal unchanged.
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
   * Both variables are required together: one of the two would leave this
   * check passing on metadata it never saw.
   */
  private readEnvironmentMetadata(
    reportLines: string[],
  ): IssueMetadataResolution {
    const body = process.env["ISSUE_BODY"] ?? "";
    const labelsDocument = process.env["ISSUE_LABELS"] ?? "";

    if (labelsDocument === "") {
      this.failWithUsageError(
        reportLines,
        "❌ Expected an issue number, or ISSUE_BODY and ISSUE_LABELS in the environment",
      );
    }

    return this.issueMetadataService.resolveFromEnvironment({
      body,
      labelsDocument,
    });
  }

  /** Reads the metadata live, through `gh issue view`. */
  private readLiveMetadata(
    reportLines: string[],
    issueNumber: string,
  ): IssueMetadataResolution {
    if (!this.issueMetadataGithubService.isAvailable()) {
      this.failWithUsageError(
        reportLines,
        `❌ Unable to read issue ${issueNumber}: gh is not available`,
      );
    }

    const view = this.issueMetadataGithubService.run([
      "issue",
      "view",
      issueNumber,
      "--json",
      "body,labels",
    ]);

    if (!view.succeeded) {
      this.failWithUsageError(
        reportLines,
        `❌ Unable to read issue ${issueNumber}: gh issue view failed (${this.issueMetadataGithubService.describeFailure(view)})`,
      );
    }

    return this.issueMetadataService.resolveFromDocument(view.standardOutput);
  }

  /** Prints the collected failures and the commands that fix them. */
  private reportFailures(
    reportLines: string[],
    failures: readonly string[],
    remediationCommands: readonly string[],
  ): never {
    this.appendToReport(reportLines, "❌ Issue metadata is invalid");
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

  /**
   * The number the remediation commands name.
   *
   * The workflow supplies `ISSUE_NUMBER`; without it the commands stay
   * printable by naming a placeholder rather than an empty string.
   */
  private resolveIssueNumber(passedParameters: string[]): string {
    const argument = passedParameters[0];

    if (argument !== undefined && ISSUE_NUMBER_PATTERN.test(argument)) {
      return argument;
    }

    const fromEnvironment = process.env["ISSUE_NUMBER"] ?? "";

    return fromEnvironment === "" ? PLACEHOLDER_ISSUE_NUMBER : fromEnvironment;
  }

  /** Reads the metadata from wherever this invocation says it lives. */
  private resolveMetadata(
    reportLines: string[],
    passedParameters: string[],
  ): IssueMetadataResolution {
    if (passedParameters.length > 1) {
      this.failWithUsageError(
        reportLines,
        "❌ Expected at most one argument, the issue number",
      );
    }

    const argument = passedParameters[0];

    if (argument === undefined) {
      return this.readEnvironmentMetadata(reportLines);
    }

    if (!ISSUE_NUMBER_PATTERN.test(argument)) {
      this.failWithUsageError(
        reportLines,
        `❌ Not an issue number: ${argument}`,
      );
    }

    return this.readLiveMetadata(reportLines, argument);
  }

  /** Sweeps and validates all open issues and their hierarchy relationships. */
  private runBulkAudit(reportLines: string[]): never | void {
    if (!this.issueMetadataGithubService.isAvailable()) {
      this.failWithUsageError(
        reportLines,
        "❌ Unable to list open issues: gh is not available",
      );
    }

    const listResult = this.issueMetadataGithubService.listOpenIssues();
    if (!listResult.success || listResult.issues === undefined) {
      this.failWithMessage(
        reportLines,
        `❌ Unable to list open issues: ${listResult.error ?? "unknown error"}`,
      );
    }

    const issues = listResult.issues;
    const verdict = this.issueMetadataService.checkBulkIssues(issues);

    if (verdict.failureCount > 0) {
      this.appendToReport(
        reportLines,
        `❌ Found ${verdict.failures.length} compliance issue(s) across ${verdict.totalIssues} open issue(s)`,
      );
      this.appendToReport(reportLines, "");
      for (const failure of verdict.failures) {
        this.appendToReport(reportLines, `- ${failure}`);
      }
      this.mirrorToStepSummary(reportLines);
      process.exit(1);
    }

    this.appendToReport(
      reportLines,
      `✅ All ${verdict.totalIssues} open issues and hierarchy relationships are compliant`,
    );
    this.mirrorToStepSummary(reportLines);
  }

  // 🌎 Public Methods

  /** Option parser for sweeping all open issues. */
  @Option({
    description: "Sweep and audit all open issues and hierarchy relationships",
    flags: "-a, --all",
  })
  public parseAllOption(): boolean {
    return true;
  }

  /** Checks the issue's metadata and exits 0 or 1 on the verdict. */
  public async run(
    passedParameters: string[],
    options?: { readonly all?: boolean },
  ): Promise<void> {
    // Nothing here is asynchronous; the base class signature is.
    await Promise.resolve();

    const reportLines: string[] = [];

    if (
      options?.all === true ||
      passedParameters.includes(ALL_ISSUES_FLAG) ||
      passedParameters.includes(ALL_ISSUES_SHORT_FLAG)
    ) {
      this.runBulkAudit(reportLines);
      return;
    }

    const resolution = this.resolveMetadata(reportLines, passedParameters);

    if (!resolution.resolved) {
      this.failWithMessage(reportLines, resolution.failure);
    }

    const formAnswers = this.issueMetadataService.parseFormAnswers(
      resolution.metadata.body,
    );
    const verdict = this.issueMetadataService.checkMetadata({
      formAnswers,
      issueNumber: this.resolveIssueNumber(passedParameters),
      metadata: resolution.metadata,
    });

    if (verdict.failures.length > 0) {
      this.reportFailures(
        reportLines,
        verdict.failures,
        verdict.remediationCommands,
      );
    }

    this.appendToReport(reportLines, "✅ Issue metadata is valid");
    this.mirrorToStepSummary(reportLines);
  }
}
