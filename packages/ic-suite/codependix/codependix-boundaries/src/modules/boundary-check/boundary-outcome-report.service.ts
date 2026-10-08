import { Injectable } from "@nestjs/common";

import { BoundaryReportService } from "../boundaries/boundary-report.service";

import {
  CONTINUATION_INDENT,
  WORKSPACE_GROUP_HEADING,
} from "./boundary-check.constants";

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

  /** Every failure of a report that is charged to some projects, not all. */
  private findProjectFailures(
    report: BoundaryReport,
  ): readonly BoundaryReportFailure[] {
    return report.failures.filter(
      (failure) => !this.isWorkspaceWide(failure, report),
    );
  }

  /** Every failure of a report charged to every project it judged. */
  private findWorkspaceFailures(
    report: BoundaryReport,
  ): readonly BoundaryReportFailure[] {
    return report.failures.filter((failure) =>
      this.isWorkspaceWide(failure, report),
    );
  }

  /** Whether a failure is charged to every project a report judged. */
  private isWorkspaceWide(
    failure: Pick<BoundaryReportFailure, "projects">,
    report: BoundaryReport,
  ): boolean {
    return this.boundaryReportService.isChargedToEveryProject({
      judgedProjects: report.judgedProjects,
      projects: failure.projects,
    });
  }

  /**
   * One bullet: the verdict in bold, then the line the log prints.
   *
   * An error is whatever a library threw, so its text may run over several
   * lines and carry `-->`. A continuation line is indented to stay inside the
   * bullet, rather than ending the list, and `-->` is written as an entity,
   * since it would close the HTML comment an anchor block lives in.
   */
  private renderBullet(verdict: string, line: string): string {
    const text = line
      .replaceAll(/\r\n?/g, "\n")
      .replaceAll("-->", "--&gt;")
      .split("\n")
      .map((part, index) =>
        index === 0 || part === "" ? part : `${CONTINUATION_INDENT}${part}`,
      )
      .join("\n");

    return `- **${verdict}** ${text}`;
  }

  /**
   * One failure as the line the log and the Markdown report both print: the
   * shape of a violation's line, with the error as its message and, when the
   * failing code belongs to another project, that project named last.
   */
  private renderFailure(args: {
    failure: JudgedBoundaryFinding<BoundaryCheckFailure>;
    judgedProjects: readonly string[];
  }): string {
    const { failure, judgedProjects } = args;
    const owner =
      failure.ownerProject === undefined
        ? ""
        : ` (failed in code owned by ${failure.ownerProject})`;

    return this.boundaryReportService.renderViolation({
      isNote: failure.verdict === "note",
      judgedProjects,
      violation: {
        level: failure.level,
        message: `${failure.error}${owner}`,
        projects: failure.projects,
      },
    });
  }

  /**
   * The bullets of every finding charged to one project, violations first.
   *
   * A failure charged to every judged project is left out: it is listed once,
   * in `renderWorkspaceGroup`, rather than under each of them.
   */
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
      ...this.findProjectFailures(report)
        .filter((failure) => failure.projects.includes(project))
        .map((failure) =>
          this.renderBullet(
            failure.verdict,
            this.renderFailure({
              failure,
              judgedProjects: report.judgedProjects,
            }),
          ),
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
    return this.boundaryReportService.renderViolation({
      isNote: violation.verdict === "note",
      violation,
    });
  }

  /**
   * The one group holding every failure charged to every judged project, in
   * place of the same bullet under each of them.
   */
  private renderWorkspaceGroup(report: BoundaryReport): string {
    const bullets = this.findWorkspaceFailures(report).map((failure) =>
      this.renderBullet(
        failure.verdict,
        this.renderFailure({ failure, judgedProjects: report.judgedProjects }),
      ),
    );

    return [`#### ${WORKSPACE_GROUP_HEADING}`, "", ...bullets].join("\n");
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
   * project. A note says which dependency it lives in instead, and a failure
   * charged to every one of `judgedProjects` says "all N judged projects".
   */
  renderFailures(
    failures: readonly JudgedBoundaryFinding<BoundaryCheckFailure>[],
    judgedProjects: readonly string[],
  ): string[] {
    return failures.map((failure) =>
      this.renderFailure({ failure, judgedProjects }),
    );
  }

  /**
   * Renders a report as the Markdown a combined document carries: the judged
   * projects, then every finding listed under each project it is charged to,
   * a note marked as not failing under the dependency it lives in. A failure
   * charged to every judged project is listed once, ahead of them, rather
   * than under each. An error's line breaks stay inside its bullet.
   *
   * A run judging no project at all — a workspace holding nothing but its
   * root, since an unmatched selection is refused before the run — says
   * "none" rather than printing an empty list.
   */
  renderMarkdown(report: BoundaryReport): string {
    const judged = `Judged projects: ${
      report.judgedProjects.length === 0
        ? "none"
        : report.judgedProjects.join(", ")
    }.`;
    const workspaceFailures = this.findWorkspaceFailures(report);
    const charged = [
      ...new Set([
        ...report.violations.flatMap((violation) => violation.projects),
        ...this.findProjectFailures(report).flatMap(
          (failure) => failure.projects,
        ),
      ]),
    ].toSorted();

    if (charged.length === 0 && workspaceFailures.length === 0) {
      return `${judged}\n\nNo boundary findings.`;
    }

    return [
      judged,
      ...(workspaceFailures.length === 0
        ? []
        : [this.renderWorkspaceGroup(report)]),
      ...charged.map((project) => this.renderProjectGroup({ project, report })),
    ].join("\n\n");
  }
}
