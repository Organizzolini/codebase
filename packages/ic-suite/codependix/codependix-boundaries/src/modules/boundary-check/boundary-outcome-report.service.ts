import { Injectable } from "@nestjs/common";

import { BoundaryReportService } from "../boundaries/boundary-report.service";

import type {
  BoundaryCheckFailure,
  BoundaryReport,
  BoundaryReportArguments,
  BoundaryReportFailure,
  BoundaryReportViolation,
  JudgedBoundaryFinding,
} from "./boundary-check.types";

/**
 * Reports what a boundary pass found — as lines, as the JSON object under the
 * `boundaries` key, and as the Markdown section of a combined document.
 *
 * Kept apart from `BoundaryReportService`, which renders rule violations
 * alone: a pass's container failures and verdicts are only known to the check
 * that judged them, and every wording that says whom a finding is charged to
 * still comes from `BoundaryReportService.describeCharge`.
 */
@Injectable()
export class BoundaryOutcomeReportService {
  // 🏗 Dependency Injection

  constructor(private readonly boundaryReportService: BoundaryReportService) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** One bullet: the verdict in bold, then the line the log prints. */
  private renderBullet(verdict: string, line: string): string {
    return `- **${verdict}** ${line}`;
  }

  /** One failure as the line the log and the Markdown report both print. */
  private renderFailure(
    failure: JudgedBoundaryFinding<BoundaryCheckFailure>,
  ): string {
    const charge = this.boundaryReportService.describeCharge({
      isNote: failure.verdict === "note",
      projects: failure.projects,
    });
    const owner =
      failure.ownerProject === undefined
        ? ""
        : ` (failed in code owned by ${failure.ownerProject})`;

    return `${failure.level} ${charge}: ${failure.error}${owner}`;
  }

  /** The bullets of every finding charged to one project, violations first. */
  private renderProjectGroup(args: {
    project: string;
    report: BoundaryReport;
  }): string {
    const { project, report } = args;
    const bullets = [
      ...report.violations
        .filter((violation) => violation.projects.includes(project))
        .map((violation) =>
          this.renderBullet(violation.verdict, this.renderViolation(violation)),
        ),
      ...report.failures
        .filter((failure) => failure.projects.includes(project))
        .map((failure) =>
          this.renderBullet(failure.verdict, this.renderFailure(failure)),
        ),
    ];

    return [`#### ${project}`, "", ...bullets].join("\n");
  }

  /** One violation as the line the log and the Markdown report both print. */
  private renderViolation(
    violation: Pick<
      BoundaryReportViolation,
      "level" | "message" | "projects" | "verdict"
    >,
  ): string {
    const charge = this.boundaryReportService.describeCharge({
      isNote: violation.verdict === "note",
      projects: violation.projects,
    });

    return `${violation.level} ${charge}: ${violation.message}`;
  }

  // 🌎 Public Methods

  /**
   * Reduces a pass's judged findings to the object `--format json` prints.
   *
   * Maps field by field rather than spreading: a violation's `scope` is where
   * it was found, not whose it is, and the report names the charged projects
   * instead. A cycle absent from an access rule is `null` and an absent owner
   * is left out, so the same key never means two things.
   */
  buildReport(args: BoundaryReportArguments): BoundaryReport {
    return {
      failures: args.outcome.failures.map((failure): BoundaryReportFailure => ({
        error: failure.error,
        level: failure.level,
        ...(failure.ownerProject !== undefined && {
          ownerProject: failure.ownerProject,
        }),
        projects: failure.projects,
        verdict: failure.verdict,
      })),
      judgedProjects: [...args.judgedProjects].toSorted(),
      violations: args.outcome.violations.map(
        (violation): BoundaryReportViolation => ({
          cycle: violation.cycle ?? null,
          level: violation.level,
          message: violation.message,
          projects: violation.projects,
          rule: violation.rule,
          source: violation.source,
          target: violation.target,
          verdict: violation.verdict,
        }),
      ),
    };
  }

  /**
   * One line per failure: its level, whom it is charged to, and the error —
   * then the project owning the code it broke on, when that is another
   * project. A note says which dependency it lives in instead.
   */
  renderFailures(
    failures: readonly JudgedBoundaryFinding<BoundaryCheckFailure>[],
  ): string[] {
    return failures.map((failure) => this.renderFailure(failure));
  }

  /**
   * Renders a report as the Markdown a combined document carries: the judged
   * projects, then every finding listed under each project it is charged to,
   * a note marked as not failing under the dependency it lives in.
   */
  renderMarkdown(report: BoundaryReport): string {
    const judged = `Judged projects: ${report.judgedProjects.join(", ")}.`;
    const charged = [
      ...new Set([
        ...report.violations.flatMap((violation) => violation.projects),
        ...report.failures.flatMap((failure) => failure.projects),
      ]),
    ].toSorted();

    if (charged.length === 0) {
      return `${judged}\n\nNo boundary findings.`;
    }

    return [
      judged,
      ...charged.map((project) => this.renderProjectGroup({ project, report })),
    ].join("\n\n");
  }
}
