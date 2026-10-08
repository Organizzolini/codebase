import { NeighborhoodService } from "@codependix/nx-projects";
import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import { ProjectGraphsService } from "../project-graphs/project-graphs.service";
import { PythonImportsService } from "../python-imports/python-imports.service";
import { WorkspaceGraphsService } from "../workspace-graphs/workspace-graphs.service";

import {
  EMPTY_GRAPH_RUN_OUTCOME,
  EMPTY_GRAPH_TYPE_PASS_OUTCOME,
  FILE_IMPORTS_GRAPH_TYPE,
  NESTJS_MODULES_GRAPH_TYPE,
  NX_PROJECTS_GRAPH_TYPE,
  WORKSPACE_GRAPH_PROJECT_NAME,
} from "./graph-run.constants";

import type { WorkspaceGraphRunOutcome } from "../workspace-graphs/workspace-graphs.types";
import type {
  CombinedGraphExports,
  GraphTypePassOutcome,
  MapRunResult,
} from "./graph-run.types";
import type { GraphRunContext } from "@codependix/boundaries";
import type { GraphRunOutcome, ProjectRunFailure } from "@codependix/core";

/**
 * Orchestrates every configured graph export, one pass per graph type.
 *
 * Owns none of the per-project or per-workspace rendering itself:
 * `ProjectGraphsService` builds, renders, and delivers each included
 * project's own graph, and `WorkspaceGraphsService` does the same for each
 * type's whole-workspace graph. This service's own job is deciding which
 * types are active, running both passes for each, combining their outcomes,
 * and collecting each active type's whole-workspace data into a
 * `CombinedGraphExports` map — for `CombinedOutputService` to print and
 * write, see `MapCommand`.
 *
 * Every pass isolates one project's failure from the rest: a missing anchor
 * or a NestJS project that fails to boot its container is collected as a
 * `ProjectRunFailure` rather than aborting the loop.
 */
@Injectable()
export class GraphRunService {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly neighborhoodService: NeighborhoodService,
    private readonly projectGraphsService: ProjectGraphsService,
    private readonly pythonImportsService: PythonImportsService,
    private readonly workspaceGraphsService: WorkspaceGraphsService,
  ) {
    this.logger.setContext(GraphRunService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Collects every active graph type's whole-workspace data into the map
   * `CombinedOutputService` reads from, dropping a type this run built no
   * whole-workspace graph for at all — see `GraphTypePassOutcome`.
   */
  private collectCombinedGraphs(args: {
    importsOutcome: GraphTypePassOutcome;
    nestjsOutcome: GraphTypePassOutcome;
    nxOutcome: GraphTypePassOutcome;
  }): CombinedGraphExports {
    const { importsOutcome, nestjsOutcome, nxOutcome } = args;
    const combinedGraphs: CombinedGraphExports = {};

    if (nxOutcome.workspaceEntry !== undefined) {
      combinedGraphs.nxProjects = nxOutcome.workspaceEntry;
    }

    if (importsOutcome.workspaceEntry !== undefined) {
      combinedGraphs.fileImports = importsOutcome.workspaceEntry;
    }

    if (nestjsOutcome.workspaceEntry !== undefined) {
      combinedGraphs.nestjsModules = nestjsOutcome.workspaceEntry;
    }

    return combinedGraphs;
  }

  /** Turns a raised error into a `ProjectRunFailure` for the given project. */
  private collectProjectFailure(
    projectName: string,
    error: unknown,
  ): ProjectRunFailure {
    return {
      error: error instanceof Error ? error.message : String(error),
      projectName,
    };
  }

  /**
   * Runs one synchronous whole-workspace graph builder, pushes its delivery
   * outcome when it produced one, and returns its combined-output entry.
   *
   * Shared by `runNxGraphs` and `runImportGraphs`, whose own
   * `WorkspaceGraphsService` calls are both synchronous;
   * `runNestjsGraphs`'s own call is asynchronous and keeps its own inline
   * `try`/`catch` rather than sharing this one.
   */
  private collectWorkspaceOutcome(args: {
    build: () => WorkspaceGraphRunOutcome;
    failures: ProjectRunFailure[];
    results: GraphRunOutcome["results"];
  }): GraphTypePassOutcome["workspaceEntry"] {
    try {
      const outcome = args.build();

      if (outcome.result !== undefined) {
        args.results.push(outcome.result);
      }

      return outcome.entry;
    } catch (error) {
      args.failures.push(
        this.collectProjectFailure(WORKSPACE_GRAPH_PROJECT_NAME, error),
      );
      return undefined;
    }
  }

  // 🌎 Public Methods

  /**
   * Runs every configured graph export against an already-resolved context.
   *
   * Every pass is attempted regardless of an earlier failure: the four graph
   * types are independent. A type `context.enabledGraphTypes` excludes is
   * skipped entirely, so `--no-nestjs-modules` never boots a container. Also
   * returns `combinedGraphs` — every active type's whole-workspace data,
   * collected for `MapCommand` to hand to `CombinedOutputService`.
   */
  async run(context: GraphRunContext): Promise<MapRunResult> {
    const { enabledGraphTypes } = context;
    const nxOutcome = enabledGraphTypes.has(NX_PROJECTS_GRAPH_TYPE)
      ? this.runNxGraphs(context)
      : EMPTY_GRAPH_TYPE_PASS_OUTCOME;
    const nestjsOutcome = enabledGraphTypes.has(NESTJS_MODULES_GRAPH_TYPE)
      ? await this.runNestjsGraphs(context)
      : EMPTY_GRAPH_TYPE_PASS_OUTCOME;
    const importsOutcome = enabledGraphTypes.has(FILE_IMPORTS_GRAPH_TYPE)
      ? this.runImportGraphs(context)
      : EMPTY_GRAPH_TYPE_PASS_OUTCOME;
    const pythonImportsOutcome = enabledGraphTypes.has(FILE_IMPORTS_GRAPH_TYPE)
      ? this.runPythonImportGraphs(context)
      : EMPTY_GRAPH_RUN_OUTCOME;

    return {
      combinedGraphs: this.collectCombinedGraphs({
        importsOutcome,
        nestjsOutcome,
        nxOutcome,
      }),
      outcome: {
        failures: [
          ...nxOutcome.failures,
          ...nestjsOutcome.failures,
          ...importsOutcome.failures,
          ...pythonImportsOutcome.failures,
        ],
        results: [
          ...nxOutcome.results,
          ...nestjsOutcome.results,
          ...importsOutcome.results,
          ...pythonImportsOutcome.results,
        ],
      },
    };
  }

  /**
   * Builds and delivers every configured file-level import graph export —
   * each included project's own graph, from `ProjectGraphsService`, and the
   * whole-workspace file-imports graph `WorkspaceGraphsService` combines
   * from every TypeScript and Python project.
   */
  runImportGraphs(context: GraphRunContext): GraphTypePassOutcome {
    const { failures, results } =
      this.projectGraphsService.runFileImportsProjects(context);
    const workspaceEntry = this.collectWorkspaceOutcome({
      build: () =>
        this.workspaceGraphsService.runFileImportsWorkspaceGraph(context),
      failures,
      results,
    });

    return { failures, results, workspaceEntry };
  }

  /**
   * Builds and delivers every configured NestJS module graph export — each
   * included project's own graph, from `ProjectGraphsService`, and the
   * whole-workspace NestJS module graph `WorkspaceGraphsService` combines
   * from every NestJS project.
   */
  async runNestjsGraphs(
    context: GraphRunContext,
  ): Promise<GraphTypePassOutcome> {
    const { failures, results } =
      await this.projectGraphsService.runNestjsModulesProjects(context);

    let workspaceEntry: GraphTypePassOutcome["workspaceEntry"];

    try {
      const workspaceOutcome =
        await this.workspaceGraphsService.runNestjsModulesWorkspaceGraph(
          context,
        );

      workspaceEntry = workspaceOutcome.entry;

      if (workspaceOutcome.result !== undefined) {
        results.push(workspaceOutcome.result);
      }
    } catch (error) {
      failures.push(
        this.collectProjectFailure(WORKSPACE_GRAPH_PROJECT_NAME, error),
      );
    }

    return { failures, results, workspaceEntry };
  }

  /**
   * Builds and delivers every configured Nx graph export — each included
   * project's Neighborhood, from `ProjectGraphsService`, and the
   * whole-workspace Workspace Graph, from `WorkspaceGraphsService`.
   */
  runNxGraphs(context: GraphRunContext): GraphTypePassOutcome {
    const neighborhoods = this.neighborhoodService.buildNeighborhoods(
      context.graph,
      context.projects,
    );
    const { failures, results } = this.projectGraphsService.runNxProjectsGraphs(
      { context, neighborhoods },
    );
    const workspaceEntry = this.collectWorkspaceOutcome({
      build: () => this.workspaceGraphsService.runNxWorkspaceGraph(context),
      failures,
      results,
    });

    return { failures, results, workspaceEntry };
  }

  /**
   * Builds and delivers every configured Python file-level import graph
   * export.
   *
   * Delegates to `PythonImportsService`. Reports no whole-workspace data of
   * its own: the Python graphs it builds are already folded into the
   * `fileImports` combined entry `runImportGraphs` reports — see
   * `WorkspaceGraphsService.runFileImportsWorkspaceGraph`.
   */
  runPythonImportGraphs(context: GraphRunContext): GraphRunOutcome {
    return this.pythonImportsService.runGraphs(context);
  }
}
