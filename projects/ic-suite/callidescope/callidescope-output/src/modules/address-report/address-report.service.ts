import { DEFAULT_JSON_INDENTATION } from "@callidescope/configuration";
import { Injectable } from "@nestjs/common";

import { MermaidReportService } from "../report/mermaid-report.service";
import { ReportService } from "../report/report.service";

import type { FramedStack } from "../report/report.types";
import type {
  BreadthReport,
  DepthReport,
  RenderBreadthArguments,
  RenderBreadthReportsArguments,
  RenderDepthArguments,
  RenderDepthReportsArguments,
} from "./address-report.types";
import type { StackFrame } from "@callidescope/core";
import type { CallableReference, CallAddressStack } from "@callidescope/graph";

/**
 * Renders `depth` and `breadth`'s findings for a terminal.
 *
 * Markdown by default and mermaid on request, the same two renderings
 * `callidescope` itself prints — a diagram at a prompt is source someone can
 * paste somewhere that draws it, and markdown is what reads well as terminal
 * text. JSON carries the same data with nothing rendered.
 */
@Injectable()
export class AddressReportService {
  // 🏗 Dependency Injection

  constructor(
    private readonly mermaidReportService: MermaidReportService,
    private readonly reportService: ReportService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** The JSON shape of one callable's direct calls. */
  private buildBreadthPayload(report: BreadthReport): unknown {
    return {
      address: report.address,
      callable: report.displayName,
      ...report.directCalls,
    };
  }

  /** The JSON shape of one callable's traced paths. */
  private buildDepthPayload(report: DepthReport): unknown {
    return {
      above: report.upward,
      address: report.address,
      below: report.downward,
    };
  }

  /** Draws every callee and caller as one diagram, the target as a stadium. */
  private renderBreadthDiagram(args: RenderBreadthArguments): string {
    const targetFrame = this.toFrame({
      displayName: args.displayName,
      id: args.id,
      location: args.location,
    });
    // Registered as its own single-frame stack first, so the diagram draws it
    // as a stadium regardless of whether a callee, a caller, both, or neither
    // is what registers it next.
    const stacks: FramedStack[] = [
      { frames: [targetFrame] },
      ...args.directCalls.callees.map((callee) => ({
        frames: [targetFrame, this.toFrame(callee)],
      })),
      ...args.directCalls.callers.map((caller) => ({
        frames: [this.toFrame(caller), targetFrame],
      })),
    ];

    return this.mermaidReportService.renderStacks({ stacks });
  }

  /** Renders one direction's paths as headed, fenced trees. */
  private renderDepthStacks(args: {
    heading: string;
    stacks: readonly CallAddressStack[];
    truncated: boolean;
  }): string {
    const suffix = args.truncated ? "+" : "";

    if (args.stacks.length === 0) {
      return [`### ${args.heading} (0)`, "", "None."].join("\n");
    }

    const rendered = args.stacks.map((stack, index) => {
      const depth = String(stack.frames.length - 1);
      const bound = stack.isLowerBound ? `≥ ${depth}` : depth;

      return [
        `**${String(index + 1)}.** depth ${bound}`,
        "",
        "```text",
        this.reportService.renderStackTree(stack),
        "```",
      ].join("\n");
    });

    return [
      `### ${args.heading} (${String(args.stacks.length)}${suffix})`,
      "",
      rendered.join("\n\n"),
    ].join("\n");
  }

  /** Renders one list of direct callees or callers as a markdown table. */
  private renderReferenceTable(args: {
    heading: string;
    references: readonly CallableReference[];
  }): string {
    if (args.references.length === 0) {
      return [`### ${args.heading} (0)`, "", "None."].join("\n");
    }

    const rows = args.references.map(
      (reference) =>
        `| \`${reference.displayName}\` | \`${reference.location.filePath}:${String(reference.location.line)}\` |`,
    );

    return [
      `### ${args.heading} (${String(args.references.length)})`,
      "",
      "| Callable | Location |",
      "| --- | --- |",
      ...rows,
    ].join("\n");
  }

  /** Turns a callable reference into a frame the diagram renderer can draw. */
  private toFrame(reference: CallableReference, isCycle = false): StackFrame {
    return {
      displayName: reference.displayName,
      documentation: undefined,
      id: reference.id,
      isCycle,
      location: reference.location,
      signature: undefined,
    };
  }

  // 🌎 Public Methods

  /** Renders one callable's direct callers and callees. */
  public renderBreadth(args: RenderBreadthArguments): string {
    if (args.format === "json") {
      return `${JSON.stringify(
        this.buildBreadthPayload(args),
        null,
        DEFAULT_JSON_INDENTATION,
      )}\n`;
    }

    if (args.format === "mermaid") {
      return [
        `# 🔭 Callidescope breadth — \`${args.address}\``,
        "",
        this.renderBreadthDiagram(args),
      ].join("\n");
    }

    return [
      `# 🔭 Callidescope breadth — \`${args.address}\``,
      "",
      this.renderReferenceTable({
        heading: "Callees",
        references: args.directCalls.callees,
      }),
      "",
      this.renderReferenceTable({
        heading: "Callers",
        references: args.directCalls.callers,
      }),
    ].join("\n");
  }

  /**
   * Renders several callables' direct calls as one document.
   *
   * JSON is **always** an array, whatever the address count, so a script can
   * `JSON.parse` a run's output without branching on how many addresses it
   * asked about. Markdown and mermaid concatenate the per-callable renders,
   * each of which already carries its own heading naming the address.
   */
  public renderBreadthReports(args: RenderBreadthReportsArguments): string {
    if (args.format === "json") {
      return `${JSON.stringify(
        args.reports.map((report) => this.buildBreadthPayload(report)),
        null,
        DEFAULT_JSON_INDENTATION,
      )}\n`;
    }

    return args.reports
      .map((report) => this.renderBreadth({ ...report, format: args.format }))
      .join("\n\n");
  }

  /** Renders the paths traced above and below one callable. */
  public renderDepth(args: RenderDepthArguments): string {
    if (args.format === "json") {
      return `${JSON.stringify(
        this.buildDepthPayload(args),
        null,
        DEFAULT_JSON_INDENTATION,
      )}\n`;
    }

    if (args.format === "mermaid") {
      return [
        `# 🔭 Callidescope depth — \`${args.address}\``,
        "",
        "## Above",
        "",
        this.mermaidReportService.renderStacks({ stacks: args.upward.stacks }),
        "",
        "## Below",
        "",
        this.mermaidReportService.renderStacks({
          stacks: args.downward.stacks,
        }),
      ].join("\n");
    }

    return [
      `# 🔭 Callidescope depth — \`${args.address}\``,
      "",
      this.renderDepthStacks({
        heading: "Above",
        stacks: args.upward.stacks,
        truncated: args.upward.truncated,
      }),
      "",
      this.renderDepthStacks({
        heading: "Below",
        stacks: args.downward.stacks,
        truncated: args.downward.truncated,
      }),
    ].join("\n");
  }

  /**
   * Renders several callables' traced paths as one document.
   *
   * JSON is **always** an array, for the same reason `renderBreadthReports`
   * does it: one run, one parseable document, regardless of address count.
   */
  public renderDepthReports(args: RenderDepthReportsArguments): string {
    if (args.format === "json") {
      return `${JSON.stringify(
        args.reports.map((report) => this.buildDepthPayload(report)),
        null,
        DEFAULT_JSON_INDENTATION,
      )}\n`;
    }

    return args.reports
      .map((report) => this.renderDepth({ ...report, format: args.format }))
      .join("\n\n");
  }
}
