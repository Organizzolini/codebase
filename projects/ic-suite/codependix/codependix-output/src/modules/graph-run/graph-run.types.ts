// 🏷️ Types

import type { CodependixGraphType } from "@codependix/configuration";
import type { GraphRunOutcome } from "@codependix/core";
import type {
  FileImportsWorkspaceGraph,
  PythonImportGraph,
  TypescriptImportGraph,
} from "@codependix/file-imports";
import type {
  NestjsModuleGraph,
  NestjsModulesWorkspaceGraph,
} from "@codependix/nestjs-modules";
import type { Neighborhood, WorkspaceGraph } from "@codependix/nx-projects";

/**
 * One graph type's whole-workspace data, captured once per run for combined
 * output — see `CombinedOutputService`.
 *
 * `json` is the same exported shape a workspace-level JSON destination would
 * receive; `markdown` is the same rendered mermaid diagram a workspace-level
 * Markdown destination would receive. Both are captured unconditionally,
 * whether or not this run's configuration names a workspace destination for
 * that graph type, so `--format`/`--json-output`/`--markdown-output` work
 * even for a workspace that configured no destination of its own.
 */
export interface CombinedGraphEntry {
  json: unknown;
  markdown: string;
}

/**
 * Every active graph type's whole-workspace data from one run, keyed by
 * graph type — the structure `--json-output`/`--markdown-output`/`--format`
 * read from. A type absent from this map was not active for the run — see
 * `GraphRunContext.enabledGraphTypes`.
 */
export type CombinedGraphExports = Partial<
  Record<CodependixGraphType, CombinedGraphEntry>
>;

/**
 * The JSON shape the whole-workspace file-level import graph export is
 * written as.
 *
 * Identical in shape to `FileImportsWorkspaceGraph` itself, kept as its own
 * named type for the same reason `NxWorkspaceGraphExport` is.
 */
export type FileImportsWorkspaceGraphExport = FileImportsWorkspaceGraph;

/**
 * One graph-type pass's outcome: the usual per-project delivery outcome,
 * plus this type's whole-workspace data for combined output.
 *
 * `workspaceEntry` is `undefined` both when the pass built no whole-workspace
 * graph of its own (`fileImports`'s Python pass, folded into the TypeScript
 * pass's own `fileImports` entry — see `GraphRunService.runImportGraphs`) and
 * when the one it owns resolved to a `"none"` target — see
 * `WorkspaceGraphsService`.
 */
export interface GraphTypePassOutcome extends GraphRunOutcome {
  workspaceEntry: CombinedGraphEntry | undefined;
}

/**
 * What `GraphRunService.run` resolves: the usual delivery outcome, and every
 * active graph type's whole-workspace data for combined output — see
 * `CombinedGraphExports`.
 */
export interface MapRunResult {
  combinedGraphs: CombinedGraphExports;
  outcome: GraphRunOutcome;
}

/**
 * The JSON shape a single project's NestJS module graph export is written as.
 *
 * Identical in shape to `NestjsModuleGraph` itself — kept as its own named
 * type so the export's JSON shape can evolve independently of
 * `codependix-nestjs-modules`'s internal representation, the same reasoning
 * `NxWorkspaceGraphExport` follows for the Nx Workspace Graph.
 */
export type NestjsModuleGraphExport = NestjsModuleGraph;

/**
 * The JSON shape the whole-workspace NestJS module graph export is written
 * as.
 *
 * Identical in shape to `NestjsModulesWorkspaceGraph` itself, kept as its own
 * named type for the same reason `NxWorkspaceGraphExport` is.
 */
export type NestjsModulesWorkspaceGraphExport = NestjsModulesWorkspaceGraph;

/** The JSON shape a single project's Nx neighborhood export is written as. */
export interface NxNeighborhoodExport {
  dependencies: string[];
  dependents: string[];
  edges: Neighborhood["edges"];
  projectName: string;
}

/**
 * The JSON shape the whole-workspace Nx Workspace Graph export is written as.
 *
 * Identical in shape to `WorkspaceGraph` itself — no extra field is added the
 * way `NxNeighborhoodExport` adds none beyond `Neighborhood` either — kept as
 * its own named type so the export's JSON shape can evolve independently of
 * `codependix-nx-projects`'s internal `WorkspaceGraph` representation.
 */
export type NxWorkspaceGraphExport = WorkspaceGraph;

/**
 * The JSON shape a single project's Python file-level import graph export is
 * written as.
 *
 * Identical in shape to `PythonImportGraph` itself, kept as its own named
 * type for the same reason `TypescriptImportGraphExport` is.
 */
export type PythonImportGraphExport = PythonImportGraph;

/**
 * The JSON shape a single project's TypeScript file-level import graph
 * export is written as.
 *
 * Identical in shape to `TypescriptImportGraph` itself — kept as its own
 * named type for the same reason `NestjsModuleGraphExport` is: so the
 * export's JSON shape can evolve independently of `codependix-file-imports`'s
 * internal representation.
 */
export type TypescriptImportGraphExport = TypescriptImportGraph;
