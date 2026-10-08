import { Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";

import { LoggerService } from "@codebase/logging";

import { IssueLabelsGithubService } from "./issue-labels-github.service";
import { ISSUE_NUMBER_PATTERN } from "./issue-labels.constants";
import { IssueLabelsService } from "./issue-labels.service";

/**
 * CLI command that adds the `type:*` and `scope:*` labels a freshly filed
 * `issue.yml` submission implies, so a new issue already carries them before
 * 🧾 Audit Issue Metadata runs its check.
 *
 * This is the write side of the label reconciliation the check-only
 * `issue-metadata` command in `projects/validation` verifies: `projects/validation`
 * holds this repository's one-sided checks, and `projects/synchronization`
 * holds the writers, so the two stay in their own projects the same way
 * `pull-request-labels` and `pull-request-metadata` do for pull requests.
 *
 * Reads `ISSUE_BODY`, `ISSUE_LABELS`, and `ISSUE_NUMBER` from the
 * environment — the only input mode, since this always runs from the
 * `issues: opened` workflow event rather than by hand. A body with no
 * `issue.yml` markers implies no labels, so this is a safe no-op for every
 * `source:agent` issue created directly through `gh issue create`.
 *
 * Always exits 0. A missing label to add is a fact about the environment or
 * the issue rather than a defect in this reconciliation, and `gh` being
 * unavailable, unauthorized, or rate-limited must never fail the workflow
 * step that runs alongside the metadata check.
 */
@Command({
  description:
    "Add the type and scope labels a submitted issue.yml body implies",
  name: "issue-labels",
})
@Injectable()
export class IssueLabelsCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly issueLabelsGithubService: IssueLabelsGithubService,
    private readonly issueLabelsService: IssueLabelsService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(IssueLabelsCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Adds one label to the issue, and logs whichever way it went. */
  private addLabel(issueNumber: string, label: string): void {
    const result = this.issueLabelsGithubService.run([
      "issue",
      "edit",
      issueNumber,
      "--add-label",
      label,
    ]);

    if (result.succeeded) {
      this.logger.log(`🏷️ Added ${label} to issue ${issueNumber}`);
      return;
    }

    this.logger.log(
      `⚠️ Failed to add ${label} to issue ${issueNumber}: ${this.issueLabelsGithubService.describeFailure(result)}`,
    );
  }

  /** Whether this value can be read by property name at all. */
  private isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object";
  }

  /** Reads one label entry's name, whichever shape it arrived in. */
  private nameOf(entry: unknown): string {
    if (typeof entry === "string") {
      return entry;
    }
    if (!this.isRecord(entry)) {
      return "";
    }
    const name = entry["name"];
    return typeof name === "string" ? name : "";
  }

  /** Reads the labels already on the issue, from `ISSUE_LABELS`. */
  private readExistingLabelNames(): string[] {
    const labelsDocument = process.env["ISSUE_LABELS"] ?? "[]";
    let parsed: unknown;

    try {
      parsed = JSON.parse(labelsDocument);
    } catch {
      return [];
    }

    if (!Array.isArray(parsed)) {
      return [];
    }

    return this.readLabelNames(parsed);
  }

  /** Reads the issue number the environment named, if any. */
  private readIssueNumber(): string | undefined {
    const issueNumber = process.env["ISSUE_NUMBER"] ?? "";
    return ISSUE_NUMBER_PATTERN.test(issueNumber) ? issueNumber : undefined;
  }

  /** Every label name in this array, with the nameless entries dropped. */
  private readLabelNames(entries: unknown[]): string[] {
    return entries
      .map((entry) => this.nameOf(entry))
      .filter((name) => name !== "");
  }

  /**
   * What this run needs to do, or `undefined` when there is nothing to add.
   *
   * Logs its own reason for skipping — no issue number, or nothing missing —
   * so `run` only has to act on the answer rather than repeat the reasoning.
   */
  private resolvePlan():
    | undefined
    | { issueNumber: string; missingLabels: string[] } {
    const issueNumber = this.readIssueNumber();
    if (issueNumber === undefined) {
      this.logger.log("📄 Skipping: no issue number in the environment");
      return undefined;
    }

    const body = process.env["ISSUE_BODY"] ?? "";
    const formAnswers = this.issueLabelsService.parseFormAnswers(body);
    const existingLabelNames = this.readExistingLabelNames();
    const missingLabels = this.issueLabelsService.missingLabels(
      formAnswers,
      existingLabelNames,
    );

    if (missingLabels.length === 0) {
      this.logger.log("📇 Verified issue labels were already in sync");
      return undefined;
    }

    return { issueNumber, missingLabels };
  }

  // 🌎 Public Methods

  /** Adds whichever type and scope labels the issue's body implies. */
  public async run(): Promise<void> {
    // Nothing here is asynchronous; the base class signature is.
    await Promise.resolve();

    const plan = this.resolvePlan();
    if (plan === undefined) {
      return;
    }

    if (!this.issueLabelsGithubService.isAvailable()) {
      this.logger.log("⚠️ Skipping label reconciliation: gh is not available");
      return;
    }

    for (const label of plan.missingLabels) {
      this.addLabel(plan.issueNumber, label);
    }
  }
}
