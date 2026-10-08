import { ConfigurationService } from "@codependix/configuration";
import {
  FileImportsWorkspaceGraphService,
  PythonService,
  TypescriptService,
} from "@codependix/file-imports";
import {
  ModuleGraphService,
  NestjsModulesWorkspaceGraphService,
  NestjsProjectService,
} from "@codependix/nestjs-modules";
import { WorkspaceGraphService } from "@codependix/nx-projects";
import { Injectable } from "@nestjs/common";

import { DeliveryService } from "../delivery/delivery.service";
import {
  FILE_IMPORTS_GRAPH_TYPE,
  FILE_IMPORTS_MARKDOWN_SUBHEADING,
  MARKDOWN_SECTION_INTRO_LINE,
  NESTJS_MODULES_GRAPH_TYPE,
  NESTJS_MODULES_MARKDOWN_SUBHEADING,
  NX_PROJECTS_GRAPH_TYPE,
  WORKSPACE_GRAPH_PROJECT_NAME,
} from "../graph-run/graph-run.constants";

import type {
  FileImportsWorkspaceGraphExport,
  NestjsModulesWorkspaceGraphExport,
  NxWorkspaceGraphExport,
} from "../graph-run/graph-run.types";
import type { WorkspaceGraphRunOutcome } from "./workspace-graphs.types";
import type { GraphRunContext } from "@codependix/boundaries";
import type { ResolvedCodependixGraphOutput } from "@codependix/configuration";
import type {
  CodependixRunMode,
  MarkdownSectionArguments,
  ProjectRunResult,
} from "@codependix/core";
import type { TypescriptImportGraph } from "@codependix/file-imports";
import type { NestjsModuleGraph } from "@codependix/nestjs-modules";
import type { WorkspaceGraph } from "@codependix/nx-projects";

/**
 * Builds and delivers every whole-workspace graph: the Nx Workspace Graph,
 * the file-imports graph (every TypeScript and Python project's own import
 * graph, combined), and the NestJS module graph (every NestJS project's own
 * module graph, combined).
 *
 * Split out of `GraphRunService` purely to keep that file under this
 * repository's per-file line limit — `GraphRunService` still owns every
 * per-project pass, and hands the whole-workspace pass for each active
 * graph type over to this service instead of building it inline.
 *
 * Each `run*WorkspaceGraph` method also hands back the graph's own rendered
 * data alongside its delivery outcome — see `WorkspaceGraphRunOutcome` — so
 * `GraphRunService.run` can collect it for combined output without building the
 * same graph a second time.
 */
@Injectable()
export class WorkspaceGraphsService {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly deliveryService: DeliveryService,
    private readonly fileImportsWorkspaceGraphService: FileImportsWorkspaceGraphService,
    private readonly moduleGraphService: ModuleGraphService,
    private readonly nestjsModulesWorkspaceGraphService: NestjsModulesWorkspaceGraphService,
    private readonly nestjsProjectService: NestjsProjectService,
    private readonly pythonService: PythonService,
    private readonly typescriptService: TypescriptService,
    private readonly workspaceGraphService: WorkspaceGraphService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Builds the section heading a graph type's anchored Markdown destination auto-creates when it is missing. */
  private buildMarkdownSection(subheading?: string): MarkdownSectionArguments {
    return { introLine: MARKDOWN_SECTION_INTRO_LINE, subheading };
  }

  /**
   * Explores and builds every discovered NestJS project's own module graph.
   *
   * Kept apart from `runNestjsModulesWorkspaceGraph` so that method's own
   * direct callees stay under this repository's callidescope breadth limit.
   */
  private async buildNestjsModuleGraphs(
    selectedProjects: GraphRunContext["selectedProjects"],
  ): Promise<NestjsModuleGraph[]> {
    const nestjsProjects =
      this.nestjsProjectService.discoverProjects(selectedProjects);
    const moduleGraphs: NestjsModuleGraph[] = [];

    for (const project of nestjsProjects) {
      const tree = await this.nestjsProjectService.exploreProject(project);

      moduleGraphs.push(this.moduleGraphService.buildGraph(tree, project.name));
    }

    return moduleGraphs;
  }

  /**
   * Builds every discovered TypeScript project's own file-level import graph.
   *
   * Kept apart from `runFileImportsWorkspaceGraph` for the same breadth
   * reason `buildNestjsModuleGraphs` is.
   */
  private buildTypescriptGraphs(
    selectedProjects: GraphRunContext["selectedProjects"],
  ): TypescriptImportGraph[] {
    return this.typescriptService
      .discoverProjects(selectedProjects)
      .map((project) =>
        this.typescriptService.buildGraph(
          this.typescriptService.buildProgram(project),
        ),
      );
  }

  /**
   * Delivers one already-built whole-workspace graph's configured
   * destinations, at the workspace root.
   *
   * The one place both `runFileImportsWorkspaceGraph` and
   * `runNestjsModulesWorkspaceGraph` hand off to `DeliveryService`, so
   * neither of them carries `DeliveryService`'s own three-call shape as
   * direct callees of its own.
   */
  private deliverWorkspaceGraph(args: {
    jsonExport: unknown;
    markdownContent: string;
    markdownSubheading: string | undefined;
    mode: CodependixRunMode;
    resolvedOutput: ResolvedCodependixGraphOutput;
    workingDirectory: string;
  }): ProjectRunResult {
    return this.deliveryService.deliverGraphOutput({
      jsonContent:
        args.resolvedOutput.json === undefined
          ? undefined
          : this.deliveryService.renderJson(args.jsonExport),
      markdownContent:
        args.resolvedOutput.markdown === undefined
          ? undefined
          : args.markdownContent,
      markdownSection: this.buildMarkdownSection(args.markdownSubheading),
      mode: args.mode,
      project: {
        absoluteRoot: args.workingDirectory,
        name: WORKSPACE_GRAPH_PROJECT_NAME,
      },
      resolvedOutput: args.resolvedOutput,
    });
  }

  // 🌎 Public Methods

  /**
   * Builds, renders, and delivers the whole-workspace file-level import
   * graph's configured destinations.
   *
   * Built from every discovered TypeScript and Python project's own import
   * graph, combined by `FileImportsWorkspaceGraphService` — the same "read
   * once, draw over the selected projects" shape `runNxWorkspaceGraph`
   * follows for the Nx Workspace Graph, applied to the two file-level import
   * builders instead of one Nx project graph read.
   *
   * The graph is not built at all when the resolved workspace target is
   * `"none"` — a workspace that never configured this destination pays
   * nothing for it, matching the target-gated shape every other pass here
   * follows. Combined output is unavailable for this type in that case too.
   */
  runFileImportsWorkspaceGraph(
    context: GraphRunContext,
  ): WorkspaceGraphRunOutcome {
    const { configuration, mode, workingDirectory } = context;
    const resolvedOutput = this.configurationService.resolveForWorkspace(
      configuration,
      FILE_IMPORTS_GRAPH_TYPE,
    );

    if (resolvedOutput.target === "none") {
      return { entry: undefined, result: undefined };
    }

    const typescriptGraphs = this.buildTypescriptGraphs(
      context.selectedProjects,
    );
    const pythonGraphs = this.pythonService
      .discoverProjects(context.selectedProjects)
      .map((project) => this.pythonService.buildGraph(project));
    const workspaceGraph =
      this.fileImportsWorkspaceGraphService.buildWorkspaceGraph({
        pythonGraphs,
        typescriptGraphs,
      });
    const jsonExport: FileImportsWorkspaceGraphExport = workspaceGraph;
    const markdownContent =
      this.fileImportsWorkspaceGraphService.renderMermaid(workspaceGraph);

    return {
      entry: { json: jsonExport, markdown: markdownContent },
      result: this.deliverWorkspaceGraph({
        jsonExport,
        markdownContent,
        markdownSubheading: FILE_IMPORTS_MARKDOWN_SUBHEADING,
        mode,
        resolvedOutput,
        workingDirectory,
      }),
    };
  }

  /**
   * Explores, builds, renders, and delivers the whole-workspace NestJS
   * module graph's configured destinations.
   *
   * Built from every discovered NestJS project's own module graph, combined
   * by `NestjsModulesWorkspaceGraphService` — the same shape
   * `runFileImportsWorkspaceGraph` follows, applied to booting every NestJS
   * project's container instead of building a `ts.Program` or parsing
   * Python source. Skipped entirely when the resolved target is `"none"`,
   * for the same reason `runFileImportsWorkspaceGraph` skips its own build.
   */
  async runNestjsModulesWorkspaceGraph(
    context: GraphRunContext,
  ): Promise<WorkspaceGraphRunOutcome> {
    const { configuration, mode, workingDirectory } = context;
    const resolvedOutput = this.configurationService.resolveForWorkspace(
      configuration,
      NESTJS_MODULES_GRAPH_TYPE,
    );

    if (resolvedOutput.target === "none") {
      return { entry: undefined, result: undefined };
    }

    const moduleGraphs = await this.buildNestjsModuleGraphs(
      context.selectedProjects,
    );
    const workspaceGraph =
      this.nestjsModulesWorkspaceGraphService.buildWorkspaceGraph(moduleGraphs);
    const jsonExport: NestjsModulesWorkspaceGraphExport = workspaceGraph;
    const markdownContent =
      this.nestjsModulesWorkspaceGraphService.renderMermaid(workspaceGraph);

    return {
      entry: { json: jsonExport, markdown: markdownContent },
      result: this.deliverWorkspaceGraph({
        jsonExport,
        markdownContent,
        markdownSubheading: NESTJS_MODULES_MARKDOWN_SUBHEADING,
        mode,
        resolvedOutput,
        workingDirectory,
      }),
    };
  }

  /**
   * Renders and delivers the Nx Workspace Graph's configured destinations.
   *
   * Built from the already-read Nx project graph — no discovery pass of its
   * own, unlike the other two whole-workspace graphs, since `GraphRunService`
   * already read it once for the whole run. Skipped entirely when the
   * resolved target is `"none"`, for the same reason
   * `runFileImportsWorkspaceGraph` skips its own build.
   */
  runNxWorkspaceGraph(context: GraphRunContext): WorkspaceGraphRunOutcome {
    const { configuration, graph, mode, workingDirectory } = context;
    const resolvedOutput = this.configurationService.resolveForWorkspace(
      configuration,
      NX_PROJECTS_GRAPH_TYPE,
    );

    if (resolvedOutput.target === "none") {
      return { entry: undefined, result: undefined };
    }

    const workspaceGraph: WorkspaceGraph =
      this.workspaceGraphService.buildWorkspaceGraph(
        graph,
        context.selectedProjects,
      );
    const jsonExport: NxWorkspaceGraphExport = workspaceGraph;
    const markdownContent =
      this.workspaceGraphService.renderMermaid(workspaceGraph);

    return {
      entry: { json: jsonExport, markdown: markdownContent },
      result: this.deliverWorkspaceGraph({
        jsonExport,
        markdownContent,
        markdownSubheading: undefined,
        mode,
        resolvedOutput,
        workingDirectory,
      }),
    };
  }
}
