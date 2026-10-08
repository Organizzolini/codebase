import { BoundaryReportService } from "@codependix/boundaries";
import { InputError } from "@codependix/configuration";
import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import type { MapRunResult } from "../graph-run/graph-run.types";
import type { BoundaryCheckOutcome } from "@codependix/boundaries";
import type { GraphRunOutcome } from "@codependix/core";

/**
 * Logs what `MapCommand`'s passes found, and decides whether each pass
 * should fail the run.
 *
 * Split out of `MapCommand` purely to keep that file under this
 * repository's per-file line limit: reporting a pass's own findings is a
 * concern of its own, separate from resolving the command line into a mode
 * and orchestrating the passes themselves.
 */
@Injectable()
export class ReportingService {
  // 🏗 Dependency Injection

  constructor(
    private readonly boundaryReportService: BoundaryReportService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(ReportingService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Logs a boundary pass's violations and failures, and reports whether the
   * run as a whole should fail.
   *
   * Violations go to the console and the exit code and nowhere else: a list of
   * things currently wrong is not a document worth publishing on the default
   * branch, and not one worth checking for staleness either.
   */
  reportBoundaries(outcome: BoundaryCheckOutcome): boolean {
    if (outcome.failures.length > 0) {
      this.logger.error("💥 Failed running codependix", undefined, {
        failures: outcome.failures,
      });
    }

    if (outcome.violations.length > 0) {
      this.logger.error("🕸️ Found codependix boundary violations", undefined, {
        summary: this.boundaryReportService.renderSummary(outcome.violations),
        violations: this.boundaryReportService.renderViolations(
          outcome.violations,
        ),
      });
    }

    return outcome.failures.length === 0 && outcome.violations.length === 0;
  }

  /**
   * Warns when nothing in the configuration selects a single project.
   *
   * `include` defaults to nothing, so a configuration naming only `defaults`
   * exports for no project at all — a run that writes nothing and still exits
   * zero. Nothing else catches it: `--check boundaries` judges every project
   * regardless of `include`, so a workspace whose exports have gone silent
   * still has a green gate.
   */
  reportEmptySelection(projectCount: number): void {
    if (projectCount > 0) return;

    this.logger.warn("🕸️ Selected no project to export", undefined, {
      hint: "name the projects that participate in the configuration's include list",
    });
  }

  /**
   * Logs why a run ended before it started, and fails it.
   *
   * A command line the input service refused — two modes named, none named
   * with no terminal to ask at, or a question walked away from — is reported
   * as a rejected command line rather than as a crash. Nothing was
   * attempted, and the reader's next move is to retype the flags, not to
   * read a stack trace.
   */
  reportFailure(error: unknown): void {
    this.logger.error(
      error instanceof InputError
        ? "🕸️ Rejected the command line"
        : "💥 Failed running codependix",
      undefined,
      { reason: error instanceof Error ? error.message : String(error) },
    );

    process.exitCode = 1;
  }

  /**
   * Logs an outcome's failures and stale exports, and reports whether the run
   * as a whole should fail.
   *
   * Both are reported together rather than the first one short-circuiting the
   * other, since `GraphRunService.run` already attempted every project
   * regardless of an earlier one's failure.
   */
  reportOutcome(outcome: GraphRunOutcome): boolean {
    const staleResults = outcome.results.filter((result) => !result.isCurrent);
    const staleProjects = [
      ...new Set(staleResults.map((result) => result.projectName)),
    ];

    if (outcome.failures.length > 0) {
      this.logger.error("💥 Failed running codependix", undefined, {
        failures: outcome.failures,
      });
    }

    if (staleProjects.length > 0) {
      const staleExports = [
        ...new Map(
          staleResults.flatMap((result) =>
            result.staleExports.map((stale) => [
              `${result.projectName}:${stale.path}:${stale.anchor ?? ""}`,
              {
                ...(stale.anchor !== undefined && { anchor: stale.anchor }),
                difference: stale.difference,
                path: stale.path,
                project: result.projectName,
              },
            ]),
          ),
        ).values(),
      ];

      this.logger.error("🕸️ Found stale codependix exports", undefined, {
        exports: staleExports,
        projects: staleProjects,
      });
    }

    return outcome.failures.length === 0 && staleProjects.length === 0;
  }

  /**
   * Weighs what each pass that ran found, reporting neither over the other.
   *
   * Both are weighed independently rather than the first failure
   * short-circuiting the second: a run gating both should report both, not
   * only the one that happened to run first.
   */
  reportPassOutcomes(args: {
    boundaryOutcome: BoundaryCheckOutcome | undefined;
    exportRun: MapRunResult | undefined;
  }): boolean {
    const exportsPassed =
      args.exportRun === undefined ||
      this.reportOutcome(args.exportRun.outcome);
    const boundariesPassed =
      args.boundaryOutcome === undefined ||
      this.reportBoundaries(args.boundaryOutcome);

    return exportsPassed && boundariesPassed;
  }

  /** Logs what each pass that ran verified, and nothing for one that did not. */
  reportSuccess(args: {
    boundaryOutcome: BoundaryCheckOutcome | undefined;
    exportOutcome: GraphRunOutcome | undefined;
  }): void {
    if (args.exportOutcome !== undefined) {
      this.logger.info(
        "🕸️ Verified every configured codependix export is current",
        undefined,
        { projects: args.exportOutcome.results.length },
      );
    }

    if (args.boundaryOutcome !== undefined) {
      this.logger.info("🕸️ Verified every declared codependix boundary holds");
    }
  }
}
