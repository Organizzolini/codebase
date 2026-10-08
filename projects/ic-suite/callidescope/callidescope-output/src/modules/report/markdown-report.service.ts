import { Injectable } from "@nestjs/common";

import { MermaidReportService } from "./mermaid-report.service";
import {
  MARKDOWN_DEEP_STACKS_HEADING,
  MARKDOWN_PROJECT_LIMIT_NAMES,
  MARKDOWN_PROJECT_LIMITS_HEADER,
  MARKDOWN_PROJECT_LIMITS_HEADING,
  MARKDOWN_PROJECT_LIMITS_SUMMARY,
  MARKDOWN_SUMMARY_HEADER,
  MARKDOWN_WIDE_CALLABLES_HEADER,
  MARKDOWN_WIDE_CALLABLES_HEADING,
  NO_LIMIT_LABEL,
} from "./report.constants";
import { ReportService } from "./report.service";
import { WorkspaceReportService } from "./workspace-report.service";

import type {
  RenderFindingsArguments,
  RenderProjectSectionArguments,
  RenderRunArguments,
  RenderStacksArguments,
  StackRendering,
} from "./report.types";
import type { ProjectLimits } from "@callidescope/configuration";
import type {
  CallableBreadthReport,
  CallGraphSummary,
  CallStack,
  WideCallableFinding,
} from "@callidescope/core";

/**
 * Renders a run, or one project's slice of it, as markdown.
 *
 * Markdown rather than a bespoke text format because the same rendering has to
 * serve three places — a terminal, a report file, and a section spliced into a
 * project's own README — and only one of those can read anything else.
 */
@Injectable()
export class MarkdownReportService {
  // 🏗 Dependency Injection

  constructor(
    private readonly mermaidReportService: MermaidReportService,
    private readonly reportService: ReportService,
    private readonly workspaceReportService: WorkspaceReportService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Renders each callable's breadth, the first few openly and the rest
   * behind a disclosure — the same treatment `renderStacks` gives stacks.
   *
   * Shared by both scopes: a project section passes every callable with a
   * direct callee, unfiltered by any limit, the same way its stacks are;
   * a whole-run section passes only the `WideCallableFinding`s that broke
   * the configured limit. `WideCallableFinding` is a `CallableBreadthReport`
   * with a `limit` added, so one renderer covers both without caring which
   * it was handed. Unfiltered, a project's breadth table is one row per
   * non-leaf callable — every bit as unbounded as its stacks — so it earns
   * the same truncation rather than a bare table.
   */
  private renderCallableBreadths(args: {
    previewCount: number;
    reports: readonly CallableBreadthReport[];
  }): string {
    const toRow = (report: CallableBreadthReport): string =>
      `| \`${report.displayName}\` | ${String(report.breadth)} | ${report.callees.map((callee) => `\`${callee.displayName}\``).join(", ")} | \`${report.location.filePath}:${String(report.location.line)}\` |`;
    const preview = args.reports.slice(0, args.previewCount);
    const remaining = args.reports.slice(args.previewCount);
    const previewTable = this.renderTable({
      header: MARKDOWN_WIDE_CALLABLES_HEADER,
      rows: preview.map((report) => toRow(report)),
    });

    if (remaining.length === 0) {
      return previewTable;
    }

    return [
      previewTable,
      "",
      "<details>",
      `<summary>${String(remaining.length)} more callables</summary>`,
      "",
      this.renderTable({
        header: MARKDOWN_WIDE_CALLABLES_HEADER,
        rows: remaining.map((report) => toRow(report)),
      }),
      "",
      "</details>",
    ].join("\n");
  }

  /**
   * Renders one limit's value cell.
   *
   * A limit the project does not declare prints `none` rather than a number,
   * which is breadth's usual case: it has no default at any level, so a
   * project writing `maximumBreadth: undefined` is gated on breadth by nothing
   * at all, and printing some number there would say the opposite.
   */
  private renderLimitCell(value: number | undefined): string {
    return value === undefined ? NO_LIMIT_LABEL : String(value);
  }

  /**
   * Renders the two limits one project is judged against.
   *
   * A project's block already carried its deepest stack and its widest
   * callable; what it could not say is what either number is measured against.
   * That was inferable while one workspace number gated everything and is not
   * inferable now — the limit is a fact about this project, and fifty projects
   * hold fifty answers.
   *
   * There is no origin column, because there is no second origin left: every
   * traced project's configuration is complete, so both numbers are written in
   * the file beside this readme or the run refused to start.
   */
  private renderProjectLimits(limits: ProjectLimits): string {
    return [
      MARKDOWN_PROJECT_LIMITS_HEADER,
      ...MARKDOWN_PROJECT_LIMIT_NAMES.map(
        (name) => `| \`${name}\` | ${this.renderLimitCell(limits[name])} |`,
      ),
    ].join("\n");
  }

  /** Renders one stack: a labelled heading line and its tree in a fence. */
  private renderStack(args: { index: number; stack: CallStack }): string {
    const { stack } = args;
    const entry = stack.frames[0]?.displayName ?? "unknown";
    const depth = stack.isLowerBound
      ? `≥ ${String(stack.depth)}`
      : String(stack.depth);

    return [
      `**${String(args.index + 1)}. \`${entry}\`** — depth ${depth} · ${stack.entryPointKind}`,
      "",
      "```text",
      this.reportService.renderStackTree(stack),
      "```",
    ].join("\n");
  }

  /** Renders the stacks of one scope, drawn or printed as asked. */
  private renderStacksAs(args: {
    previewCount: number;
    rendering: StackRendering;
    stacks: readonly CallStack[];
  }): string {
    return args.rendering === "diagram"
      ? this.mermaidReportService.renderStacks({ stacks: args.stacks })
      : this.renderStacks({
          previewCount: args.previewCount,
          stacks: args.stacks,
        });
  }

  /** Renders the counts describing what a run, or a project, produced. */
  private renderSummaryTable(summary: CallGraphSummary): string {
    return [
      MARKDOWN_SUMMARY_HEADER,
      `| Callables | ${String(summary.callableCount)} |`,
      `| Files | ${String(summary.fileCount)} |`,
      `| Calls traced | ${String(summary.edgeCount)} |`,
      `| Call stacks | ${String(summary.entryPointCount)} |`,
      `| Deepest stack | ${String(summary.maximumDepth)} |`,
      `| Stacks through recursion | ${String(summary.cyclicComponentCount)} |`,
      `| Unfollowable calls | ${String(summary.unresolvedCallCount)} |`,
    ].join("\n");
  }

  /** Renders a table, or says plainly that there was nothing to put in one. */
  private renderTable(args: {
    header: string;
    rows: readonly string[];
  }): string {
    return args.rows.length === 0
      ? "None."
      : `${args.header}\n${args.rows.join("\n")}`;
  }

  /**
   * Names each callable that broke its breadth limit, a line each.
   *
   * A line rather than `renderCallableBreadths`' table, and deliberately not
   * that method reused: the table's columns say what a callable calls, and a
   * finding's product is the number it broke. `limit` is per project now, so a
   * reader cannot infer it from the run the way a single workspace-wide number
   * could be inferred — it has to be printed beside the breadth it failed.
   */
  private renderWideCallableLines(
    findings: readonly WideCallableFinding[],
  ): string {
    if (findings.length === 0) {
      return "None.";
    }

    return findings
      .map(
        (finding) =>
          `- \`${finding.displayName}\` — ${String(finding.breadth)} direct callees, limit ${String(finding.limit)} (${finding.location.filePath})`,
      )
      .join("\n");
  }

  /**
   * The heading prefix one level below the block's own.
   *
   * Derived rather than fixed, so a block spliced under an `##` heading writes
   * `###` subsections and stays a well-formed subtree of the file it landed
   * in. A heading carrying no leading `#` at all yields `##`, which is the
   * level these sections had before the heading was configurable.
   */
  private subsectionPrefix(heading: string): string {
    return "#".repeat((/^#+/.exec(heading)?.[0].length ?? 1) + 1);
  }

  // 🌎 Public Methods

  /**
   * Renders the two findings a gate weighs, and nothing else.
   *
   * A gate prints why it decided rather than what it read: the full report is
   * what a trace is for, and burying two deep stacks in a listing of every
   * stack in the project is how a failed pipeline stops being read.
   *
   * Here rather than in the caller because rendering is this package's job,
   * and because the headings are `renderRun`'s headings — written once, so a
   * reader who greps a pipeline log for one rendering finds the other.
   */
  public renderFindings(args: RenderFindingsArguments): string {
    const { deepStacks, wideCallables } = args;

    return [
      `## ${MARKDOWN_DEEP_STACKS_HEADING} (${String(deepStacks.length)})`,
      "",
      this.renderStacks({
        previewCount: args.previewCount,
        stacks: deepStacks,
      }),
      "",
      `## ${MARKDOWN_WIDE_CALLABLES_HEADING} (${String(wideCallables.length)})`,
      "",
      this.renderWideCallableLines(wideCallables),
    ].join("\n");
  }

  /** Renders one project's section, for splicing into its own README. */
  public renderProjectSection(args: RenderProjectSectionArguments): string {
    const { report } = args;

    return [
      args.heading,
      "",
      `Call stacks traced through \`${report.projectName}\`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.`,
      "",
      this.renderSummaryTable(report.summary),
      "",
      `### ${MARKDOWN_PROJECT_LIMITS_HEADING}`,
      "",
      MARKDOWN_PROJECT_LIMITS_SUMMARY,
      "",
      this.renderProjectLimits(
        this.workspaceReportService.limitsFor({
          limits: args.limits,
          projectName: report.projectName,
        }),
      ),
      "",
      "### Call stacks (depth)",
      "",
      this.renderStacksAs({
        previewCount: args.previewCount,
        rendering: args.rendering,
        stacks: report.stacks,
      }),
      "",
      "### Breadth",
      "",
      this.renderCallableBreadths({
        previewCount: args.previewCount,
        reports: report.callableBreadths,
      }),
    ].join("\n");
  }

  /**
   * Renders a whole run, for a terminal or a report file.
   *
   * Opens with what the run adds up to rather than with its findings: the
   * summary, the per-project index, and the headroom each project has left.
   * A workspace holding fifty projects is not readable as a list of
   * callables, and every section below these three is one — so a reader
   * arriving at this block learns which project to look at before being
   * handed the stacks.
   */
  public renderRun(args: RenderRunArguments): string {
    const { result } = args;
    const subsection = this.subsectionPrefix(args.heading);
    const rows = this.workspaceReportService.buildRows({
      limits: args.limits,
      projects: result.projects,
    });

    return [
      args.heading,
      "",
      ...(args.description === undefined ? [] : [args.description, ""]),
      this.renderSummaryTable(result.summary),
      "",
      `${subsection} Projects`,
      "",
      this.workspaceReportService.renderProjectIndex({
        limits: args.limits,
        projects: result.projects,
      }),
      "",
      `${subsection} Depth headroom`,
      "",
      this.workspaceReportService.renderHeadroom(rows),
      "",
      `${subsection} ${MARKDOWN_DEEP_STACKS_HEADING} (${String(result.deepStacks.length)})`,
      "",
      this.renderStacksAs({
        previewCount: args.previewCount,
        rendering: args.rendering,
        stacks: result.deepStacks,
      }),
      "",
      `${subsection} ${MARKDOWN_WIDE_CALLABLES_HEADING} (${String(result.wideCallables.length)})`,
      "",
      this.renderCallableBreadths({
        previewCount: args.previewCount,
        reports: result.wideCallables,
      }),
      "",
    ].join("\n");
  }

  /**
   * Renders every stack, the first few openly and the rest behind a disclosure.
   *
   * A package with two hundred stacks is still worth publishing in full — an
   * agent reading the file can expand it, and a person scrolling past should
   * not have to.
   */
  public renderStacks(args: RenderStacksArguments): string {
    if (args.stacks.length === 0) {
      return "None.";
    }

    const rendered = args.stacks.map((stack, index) =>
      this.renderStack({ index, stack }),
    );
    const preview = rendered.slice(0, args.previewCount).join("\n\n");
    const remaining = rendered.slice(args.previewCount);

    if (remaining.length === 0) {
      return preview;
    }

    return [
      preview,
      "",
      "<details>",
      `<summary>${String(remaining.length)} more call stacks</summary>`,
      "",
      remaining.join("\n\n"),
      "",
      "</details>",
    ].join("\n");
  }
}
