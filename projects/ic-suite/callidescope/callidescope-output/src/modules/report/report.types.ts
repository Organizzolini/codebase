// 🏷️ Types

import type { OwnedFindings } from "../project-reports/project-reports.types";
import type { ProjectLimitsLookup } from "@callidescope/configuration";
import type {
  CallableId,
  CallGraphResult,
  CallStack,
  ProjectReport,
  StackFrame,
} from "@callidescope/core";

/**
 * Anything holding a frame list, whether or not it is a full `CallStack`.
 *
 * `ReportService.renderStackTree` and `MermaidReportService.renderStacks`
 * only ever read `frames`, so this is what they accept: a full `CallStack`
 * satisfies it, and so does a path with no depth or entry-point kind of its
 * own, such as one traced from an arbitrary address rather than a recognized
 * entry point.
 */
export interface FramedStack {
  readonly frames: readonly StackFrame[];
}

/**
 * A diagram under construction.
 *
 * Mutable, and deliberately so: nodes and edges accumulate across every stack
 * drawn, and threading an immutable accumulator through that would say nothing
 * the name does not.
 */
export interface MermaidDiagram {
  readonly edges: Set<string>;
  readonly identifiersByCallable: Map<CallableId, string>;
  readonly nodes: string[];
}

/** One project's row in the index, and the numbers the scoreboard buckets it by. */
export interface ProjectIndexRow {
  readonly deepest: number;
  readonly headroom: number;
  readonly limit: number;
  readonly projectName: string;
  readonly widest: number;
}

/**
 * Arguments for rendering only the findings a gate weighs.
 *
 * No `rendering`, unlike `RenderRunArguments`: a gate's product is the list of
 * things to go and fix, and a diagram of them is not that list.
 *
 * The findings themselves rather than the run that produced them, also unlike
 * `RenderRunArguments`: a scoped gate judges fewer findings than its trace
 * measured, and a renderer handed the whole run would print the ones it was
 * not judged on.
 */
export interface RenderFindingsArguments extends OwnedFindings {
  readonly previewCount: number;
}

/** Arguments for rendering the per-project index and its scoreboard. */
export interface RenderProjectIndexArguments {
  readonly limits: ProjectLimitsLookup;
  readonly projects: readonly ProjectReport[];
}

/** Arguments for rendering one project's section. */
export interface RenderProjectSectionArguments {
  readonly heading: string;
  /**
   * The lookup the whole run resolved, rather than this project's two numbers.
   *
   * The renderer reads its own row out of it through the same `limitsFor` the
   * index and the gate read, so a project's block and the workspace's view of
   * that project cannot come to disagree about which limit applied.
   */
  readonly limits: ProjectLimitsLookup;
  readonly previewCount: number;
  readonly rendering: StackRendering;
  readonly report: ProjectReport;
}

/** Arguments for rendering a whole run. */
export interface RenderRunArguments {
  /** Prose placed under the heading, from the destination that asked for it. */
  readonly description: string | undefined;
  readonly heading: string;
  readonly limits: ProjectLimitsLookup;
  readonly previewCount: number;
  readonly rendering: StackRendering;
  readonly result: CallGraphResult;
}

/** Arguments for rendering a run's stacks, preview then disclosure. */
export interface RenderStacksArguments {
  readonly previewCount: number;
  readonly stacks: readonly CallStack[];
}

/**
 * How a report draws the stacks it found.
 *
 * Narrower than `CallidescopeOutputFormat` on purpose: `json` is a different
 * report rather than a different drawing of this one, and a renderer that had
 * to accept it would carry a case it can never answer.
 */
export type StackRendering = "diagram" | "tree";
