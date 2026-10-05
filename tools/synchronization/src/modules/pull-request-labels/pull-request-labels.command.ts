import { appendFileSync } from "node:fs";

import { Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";

import { LoggerService } from "@codebase/logging";

import { SynchronizationService } from "../synchronization/synchronization.service";

import { PullRequestLabelsGithubService } from "./pull-request-labels-github.service";
import {
  LABEL_LIST_LIMIT,
  STEP_SUMMARY_FAILURE_MESSAGE,
  STEP_SUMMARY_VARIABLE,
} from "./pull-request-labels.constants";
import { PullRequestLabelsService } from "./pull-request-labels.service";

import type {
  SynchronizableCommand,
  SynchronizationMode,
} from "../synchronization/synchronization.types";
import type {
  ConventionalLabel,
  LabelReconciliationPlan,
} from "./pull-request-labels.types";

/**
 * CLI command that reconciles this repository's label vocabulary against
 * `configuration/conventional.config.cjs`.
 *
 * Every `type:<name>`, every lowercased `scope:<name>`, and the three static
 * labels — `do-not-merge`, `source:agent`, and `source:human` — must exist
 * before 🧾 Validate Pull Request Metadata can pass, because that gate asks a
 * pull request to carry labels naming its own title. A change introducing a
 * new scope would otherwise be unmergeable until somebody created the label by
 * hand.
 *
 * It creates what is missing and updates whatever color or description
 * drifted. It never deletes: a label the configuration dropped may still be on
 * open pull requests, so it is reported as stale, with the `gh label delete`
 * command that would remove it, for a human to decide on.
 *
 * It always succeeds. A missing or drifted label is a fact about the
 * repository under review rather than a defect in the pull request, and a
 * `gh` that is absent, read-only on a fork, or rate-limited is an environment
 * rather than an answer. Both are warnings, so this can never be the reason a
 * pull request goes red.
 */
@Command({
  description: "Run the pull-request-labels command",
  name: "pull-request-labels",
})
@Injectable()
export class PullRequestLabelsCommand
  extends CommandRunner
  implements SynchronizableCommand
{
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly pullRequestLabelsGithubService: PullRequestLabelsGithubService,
    private readonly pullRequestLabelsService: PullRequestLabelsService,
    private readonly synchronizationModeService: SynchronizationService,
  ) {
    super();
    this.logger.setContext(PullRequestLabelsCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  readonly synchronizationLabel = "pull-request-labels";

  // 🔏 Private Methods

  /** Echoes one report line and keeps it for the step summary. */
  private appendToReport(reportLines: string[], reportLine: string): void {
    reportLines.push(reportLine);
    console.info(reportLine);
  }

  /** Creates every label the repository is missing. */
  private createLabels(
    creations: readonly ConventionalLabel[],
    reportLines: string[],
  ): void {
    for (const label of creations) {
      const creation = this.pullRequestLabelsGithubService.run([
        "label",
        "create",
        label.name,
        "--color",
        label.color,
        "--description",
        label.description,
      ]);

      if (!creation.succeeded) {
        this.appendToReport(
          reportLines,
          `- ⚠️ Unable to reconcile labels: gh label create failed for ${label.name} (${this.pullRequestLabelsGithubService.describeFailure(creation)})`,
        );
        continue;
      }

      this.appendToReport(reportLines, `- ✅ Created label: ${label.name}`);
    }
  }

  /** Whatever went wrong, as the one line a report can carry. */
  private describeError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  /** Names what a write would create and update, without doing either. */
  private describePlan(
    plan: LabelReconciliationPlan,
    reportLines: string[],
  ): void {
    for (const label of plan.creations) {
      this.appendToReport(reportLines, `- ⚠️ Missing label: ${label.name}`);
    }

    for (const label of plan.updates) {
      this.appendToReport(
        reportLines,
        `- ⚠️ Drifted label: ${label.name} — its color or description differs from the configuration`,
      );
    }

    this.appendToReport(
      reportLines,
      "- 🔧 Reconcile with: nx run synchronization:pull-request-labels:write",
    );
  }

  /**
   * Mirrors the report into the GitHub Actions step summary, if there is one.
   *
   * The report is a courtesy; the verdict is not. A full disk, or a summary
   * file that cannot be opened for appending, must never change what this
   * command reports — so the write is guarded and its failure only noted.
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
   * Reconciles the vocabulary, appending everything it did to the report.
   *
   * Creating and updating is one pass and the stale report is another, rather
   * than the two interleaved, so "nothing needed creating or updating" can be
   * said on its own. With the repository already reconciled that is the normal
   * path, and the standing stale label here means the report is otherwise
   * never empty enough to imply it.
   */
  private reconcile(mode: SynchronizationMode, reportLines: string[]): void {
    const listing = this.pullRequestLabelsGithubService.run([
      "label",
      "list",
      "--limit",
      LABEL_LIST_LIMIT,
      "--json",
      "name,color,description",
    ]);

    if (!listing.succeeded) {
      this.appendToReport(
        reportLines,
        `- ⚠️ Unable to reconcile labels: gh label list failed (${this.pullRequestLabelsGithubService.describeFailure(listing)})`,
      );
      return;
    }

    let plan: LabelReconciliationPlan;

    try {
      plan = this.pullRequestLabelsService.planReconciliation({
        currentLabels: this.pullRequestLabelsService.parseRepositoryLabels(
          listing.standardOutput,
        ),
        expectedLabels: this.pullRequestLabelsService.readExpectedLabels(),
      });
    } catch (error) {
      this.appendToReport(
        reportLines,
        `- ⚠️ Unable to reconcile labels: label comparison failed (${this.describeError(error)})`,
      );
      return;
    }

    this.reportPlan(mode, plan, reportLines);
    this.reportStaleLabels(plan, reportLines);
  }

  /** Reports the plan, acting on it in `write` mode and only naming it in `check`. */
  private reportPlan(
    mode: SynchronizationMode,
    plan: LabelReconciliationPlan,
    reportLines: string[],
  ): void {
    if (plan.creations.length === 0 && plan.updates.length === 0) {
      this.appendToReport(
        reportLines,
        "- ✅ All conventional labels are present and match the configuration",
      );
      return;
    }

    if (mode === "check") {
      this.describePlan(plan, reportLines);
      return;
    }

    this.createLabels(plan.creations, reportLines);
    this.updateLabels(plan.updates, reportLines);
  }

  /** Names every tracked label the configuration no longer has, deleting none. */
  private reportStaleLabels(
    plan: LabelReconciliationPlan,
    reportLines: string[],
  ): void {
    for (const staleName of plan.staleNames) {
      this.appendToReport(
        reportLines,
        `- ⚠️ Stale label (not in conventional.config.cjs): ${staleName} — remove with: gh label delete "${staleName}"`,
      );
    }
  }

  /** Brings every drifted label's color and description back in line. */
  private updateLabels(
    updates: readonly ConventionalLabel[],
    reportLines: string[],
  ): void {
    for (const label of updates) {
      const edit = this.pullRequestLabelsGithubService.run([
        "label",
        "edit",
        label.name,
        "--color",
        label.color,
        "--description",
        label.description,
      ]);

      if (!edit.succeeded) {
        this.appendToReport(
          reportLines,
          `- ⚠️ Unable to reconcile labels: gh label edit failed for ${label.name} (${this.pullRequestLabelsGithubService.describeFailure(edit)})`,
        );
        continue;
      }

      this.appendToReport(reportLines, `- ✅ Updated label: ${label.name}`);
    }
  }

  // 🌎 Public Methods

  /** Runs the pull-request-labels reconciliation in check or write mode. */
  public async run(passedParameters: string[]): Promise<void> {
    const mode =
      this.synchronizationModeService.resolveSynchronizationModeOrExit({
        invalidModeLabel: "Unknown mode",
        loggerService: this.logger,
        passedParameters,
        usageMessage: "Expected 'check' or 'write'",
      });

    await this.synchronize(mode);
  }

  /**
   * Reconciles the label vocabulary and always reports success.
   *
   * The return value is `true` whatever happened, which is the whole contract:
   * this command reports on the repository rather than on the change under
   * review, so nothing it finds is grounds for failing that change.
   */
  public async synchronize(mode: SynchronizationMode): Promise<boolean> {
    // Nothing here is asynchronous; the interface is, because other
    // synchronizers load configuration.
    await Promise.resolve();

    const reportLines: string[] = [];

    try {
      this.reconcile(mode, reportLines);
    } catch (error) {
      this.appendToReport(
        reportLines,
        `- ⚠️ Unable to reconcile labels: ${this.describeError(error)}`,
      );
    }

    this.mirrorToStepSummary(reportLines);

    this.logger.log("🏷️ Reconciled the pull request labels", undefined, {
      lines: reportLines.length,
      mode,
    });

    return true;
  }
}
