import path from "node:path";

import { ConfigurationService } from "@codependix/configuration";
import { TypescriptService } from "@codependix/file-imports";
import {
  ModuleGraphService,
  NestjsProjectService,
} from "@codependix/nestjs-modules";
import { NeighborhoodService } from "@codependix/nx-projects";
import { Injectable } from "@nestjs/common";

import { DeliveryService } from "../delivery/delivery.service";
import {
  FILE_IMPORTS_GRAPH_TYPE,
  FILE_IMPORTS_MARKDOWN_SUBHEADING,
  MARKDOWN_SECTION_INTRO_LINE,
  NESTJS_MODULES_GRAPH_TYPE,
  NESTJS_MODULES_MARKDOWN_SUBHEADING,
  NX_PROJECTS_GRAPH_TYPE,
  NX_PROJECTS_MARKDOWN_SUBHEADING,
} from "../graph-run/graph-run.constants";

import type {
  NestjsModuleGraphExport,
  NxNeighborhoodExport,
  TypescriptImportGraphExport,
} from "../graph-run/graph-run.types";
import type { GraphRunContext } from "@codependix/boundaries";
import type {
  CodependixGraphType,
  ResolvedCodependixGraphOutput,
} from "@codependix/configuration";
import type {
  CodependixRunMode,
  GraphRunOutcome,
  MarkdownSectionArguments,
  ProjectRunFailure,
  ProjectRunResult,
} from "@codependix/core";
import type { TypescriptProject } from "@codependix/file-imports";
import type { NestjsProject } from "@codependix/nestjs-modules";
import type { Neighborhood, NxProject } from "@codependix/nx-projects";

/**
 * Builds, renders, and delivers every included project's own graph, for
 * each of the three graph types — the Nx Neighborhood, the TypeScript/Python
 * file-level import graph, and the NestJS module graph.
 *
 * Split out of `GraphRunService`, which keeps only orchestration — resolving the
 * context once, deciding which graph types are active, and combining this
 * service's per-project outcome with `WorkspaceGraphsService`'s own
 * whole-workspace one — purely to stay under this repository's per-file line
 * limit. Every method here isolates one project's failure from the rest: a
 * missing anchor or a NestJS project that fails to boot its container is
 * collected as a `ProjectRunFailure` rather than aborting the loop.
 */
@Injectable()
export class ProjectGraphsService {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly deliveryService: DeliveryService,
    private readonly moduleGraphService: ModuleGraphService,
    private readonly neighborhoodService: NeighborhoodService,
    private readonly nestjsProjectService: NestjsProjectService,
    private readonly typescriptService: TypescriptService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Builds the section heading a graph type's anchored Markdown destination
   * auto-creates when it is missing.
   */
  private buildMarkdownSection(subheading: string): MarkdownSectionArguments {
    return { introLine: MARKDOWN_SECTION_INTRO_LINE, subheading };
  }

  /** Turns a neighborhood into the JSON shape it is exported as. */
  private buildNeighborhoodJsonExport(
    neighborhood: Neighborhood,
  ): NxNeighborhoodExport {
    return {
      dependencies: neighborhood.dependencies,
      dependents: neighborhood.dependents,
      edges: neighborhood.edges,
      projectName: neighborhood.projectName,
    };
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

  /** Resolves one project's export target for a graph type, carrying its root/tags. */
  private resolveProjectOutput(args: {
    context: GraphRunContext;
    graphType: CodependixGraphType;
    project: { absoluteRoot: string; name: string };
  }): ResolvedCodependixGraphOutput {
    const { context, graphType, project } = args;

    return this.configurationService.resolveForProject({
      configuration: context.configuration,
      graphType,
      projectConfiguration: context.projectConfigurations.get(project.name),
      projectName: project.name,
      projectRoot: path.relative(
        context.workingDirectory,
        project.absoluteRoot,
      ),
      projectTags: context.projects.find(
        (candidate) => candidate.name === project.name,
      )?.tags,
    });
  }

  /** Builds, renders, and delivers one project's file-level import Graph. */
  private runImportProject(args: {
    mode: CodependixRunMode;
    project: TypescriptProject;
    resolvedOutput: ResolvedCodependixGraphOutput;
  }): ProjectRunResult {
    const { mode, project, resolvedOutput } = args;
    const projectProgram = this.typescriptService.buildProgram(project);
    const importGraph = this.typescriptService.buildGraph(projectProgram);
    const jsonExport: TypescriptImportGraphExport = importGraph;

    return this.deliveryService.deliverGraphOutput({
      jsonContent:
        resolvedOutput.json === undefined
          ? undefined
          : this.deliveryService.renderJson(jsonExport),
      markdownContent:
        resolvedOutput.markdown === undefined
          ? undefined
          : this.typescriptService.renderMermaid(importGraph),
      markdownSection: this.buildMarkdownSection(
        FILE_IMPORTS_MARKDOWN_SUBHEADING,
      ),
      mode,
      project,
      resolvedOutput,
    });
  }

  /** Explores, renders, and delivers one NestJS project's module graph. */
  private async runNestjsProject(args: {
    mode: CodependixRunMode;
    project: NestjsProject;
    resolvedOutput: ResolvedCodependixGraphOutput;
  }): Promise<ProjectRunResult> {
    const { mode, project, resolvedOutput } = args;
    const tree = await this.nestjsProjectService.exploreProject(project);
    const moduleGraph = this.moduleGraphService.buildGraph(tree, project.name);
    const jsonExport: NestjsModuleGraphExport = moduleGraph;

    return this.deliveryService.deliverGraphOutput({
      jsonContent:
        resolvedOutput.json === undefined
          ? undefined
          : this.deliveryService.renderJson(jsonExport),
      markdownContent:
        resolvedOutput.markdown === undefined
          ? undefined
          : this.moduleGraphService.renderMermaid(moduleGraph),
      markdownSection: this.buildMarkdownSection(
        NESTJS_MODULES_MARKDOWN_SUBHEADING,
      ),
      mode,
      project,
      resolvedOutput,
    });
  }

  /** Renders and delivers one project's Nx Neighborhood. */
  private runNxProject(args: {
    mode: CodependixRunMode;
    neighborhood: Neighborhood;
    project: NxProject;
    resolvedOutput: ResolvedCodependixGraphOutput;
  }): ProjectRunResult {
    const { mode, neighborhood, project, resolvedOutput } = args;

    return this.deliveryService.deliverGraphOutput({
      jsonContent:
        resolvedOutput.json === undefined
          ? undefined
          : this.deliveryService.renderJson(
              this.buildNeighborhoodJsonExport(neighborhood),
            ),
      markdownContent:
        resolvedOutput.markdown === undefined
          ? undefined
          : this.neighborhoodService.renderMermaid(neighborhood),
      markdownSection: this.buildMarkdownSection(
        NX_PROJECTS_MARKDOWN_SUBHEADING,
      ),
      mode,
      project,
      resolvedOutput,
    });
  }

  // 🌎 Public Methods

  /** Builds, renders, and delivers every included TypeScript project's own file-level import graph. */
  runFileImportsProjects(context: GraphRunContext): GraphRunOutcome {
    const typescriptProjects = this.typescriptService.discoverProjects(
      context.projects,
    );
    const results: GraphRunOutcome["results"] = [];
    const failures: ProjectRunFailure[] = [];

    for (const project of typescriptProjects) {
      const resolvedOutput = this.resolveProjectOutput({
        context,
        graphType: FILE_IMPORTS_GRAPH_TYPE,
        project,
      });

      if (resolvedOutput.target === "none") {
        continue;
      }

      try {
        results.push(
          this.runImportProject({
            mode: context.mode,
            project,
            resolvedOutput,
          }),
        );
      } catch (error) {
        failures.push(this.collectProjectFailure(project.name, error));
      }
    }

    return { failures, results };
  }

  /** Explores, builds, renders, and delivers every included NestJS project's own module graph. */
  async runNestjsModulesProjects(
    context: GraphRunContext,
  ): Promise<GraphRunOutcome> {
    const nestjsProjects = this.nestjsProjectService.discoverProjects(
      context.projects,
    );
    const results: GraphRunOutcome["results"] = [];
    const failures: ProjectRunFailure[] = [];

    for (const project of nestjsProjects) {
      const resolvedOutput = this.resolveProjectOutput({
        context,
        graphType: NESTJS_MODULES_GRAPH_TYPE,
        project,
      });

      if (resolvedOutput.target === "none") {
        continue;
      }

      try {
        results.push(
          await this.runNestjsProject({
            mode: context.mode,
            project,
            resolvedOutput,
          }),
        );
      } catch (error) {
        failures.push(this.collectProjectFailure(project.name, error));
      }
    }

    return { failures, results };
  }

  /** Renders and delivers every included project's own Nx Neighborhood. */
  runNxProjectsGraphs(args: {
    context: GraphRunContext;
    neighborhoods: Map<string, Neighborhood>;
  }): GraphRunOutcome {
    const { context, neighborhoods } = args;
    const results: GraphRunOutcome["results"] = [];
    const failures: ProjectRunFailure[] = [];

    for (const project of context.projects) {
      const neighborhood = neighborhoods.get(project.name);
      const resolvedOutput = this.resolveProjectOutput({
        context,
        graphType: NX_PROJECTS_GRAPH_TYPE,
        project,
      });

      if (neighborhood === undefined || resolvedOutput.target === "none") {
        continue;
      }

      try {
        results.push(
          this.runNxProject({
            mode: context.mode,
            neighborhood,
            project,
            resolvedOutput,
          }),
        );
      } catch (error) {
        failures.push(this.collectProjectFailure(project.name, error));
      }
    }

    return { failures, results };
  }
}
