import path from "node:path";

import {
  CODEPENDIX_GRAPH_TYPES,
  ConfigurationService,
} from "@codependix/configuration";
import { NeighborhoodService } from "@codependix/nx-projects";
import { Injectable } from "@nestjs/common";

import type { GraphRunContext } from "./run-context.types";
import type {
  CodependixGraphType,
  CodependixProjectConfiguration,
  MapCommandOptions,
  ResolvedCodependixConfiguration,
} from "@codependix/configuration";
import type { CodependixRunMode } from "@codependix/core";
import type { NxProject } from "@codependix/nx-projects";

/**
 * Resolves everything one run reads, once, before any pass runs.
 *
 * Kept apart from the passes that read it because the two answer different
 * questions: what this workspace is, versus what to do about it. Every pass —
 * the four export passes, the Workspace Graph, and the boundary gate — is
 * handed the same resolved context rather than resolving its own, so a run
 * reads the project graph once and judges one workspace.
 */
@Injectable()
export class RunContextService {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly neighborhoodService: NeighborhoodService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Loads every project's own `codependix.config.ts`, keyed by project name.
   *
   * Loaded once per run, up front, rather than once per graph-type pass: a
   * project with no file of its own is a normal, expected outcome rather than
   * a failure, so every project is attempted and the map simply holds
   * `undefined` for the ones naming none.
   */
  private async loadProjectConfigurations(
    projects: NxProject[],
  ): Promise<Map<string, CodependixProjectConfiguration | undefined>> {
    const entries = await Promise.all(
      projects.map(
        async (project) =>
          [
            project.name,
            await this.configurationService.loadProjectConfiguration({
              projectRoot: project.absoluteRoot,
            }),
          ] as const,
      ),
    );

    return new Map(entries);
  }

  /**
   * Reads the three graph-type toggle flags into the set of graph types this
   * run builds, checks, and writes.
   *
   * A graph type is enabled unless its own `--no-*` flag disabled it —
   * `--file-imports`/`--nestjs-modules`/`--nx-projects` exist only for
   * symmetry with the negated form, matching every graph type's default of
   * "on" when neither flag was given.
   */
  private resolveEnabledGraphTypes(
    options: MapCommandOptions,
  ): Set<CodependixGraphType> {
    return new Set(
      CODEPENDIX_GRAPH_TYPES.filter(
        (graphType) => options[graphType] !== false,
      ),
    );
  }

  /**
   * Resolves a supplied project graph's path against the workspace root.
   *
   * The same root every export path resolves against — `--directory` keeps
   * its one meaning, and a supplied graph's workspace-relative node roots
   * resolve underneath it too.
   */
  private resolveProjectGraphPath(
    projectGraph: string | undefined,
    workingDirectory: string,
  ): string | undefined {
    return projectGraph === undefined
      ? undefined
      : path.resolve(workingDirectory, projectGraph);
  }

  /**
   * Narrows every project to the set `--projects` and `--tags` named.
   *
   * A run naming neither selects every project, which is what keeps the
   * Workspace Graph whole and the boundary gate judging the whole workspace by
   * default. `include`/`exclude` deliberately do not reach this: they decide
   * which projects have exports written for them, not which projects a graph
   * is drawn over.
   */
  private selectProjects(args: {
    configuration: ResolvedCodependixConfiguration;
    projects: NxProject[];
    workingDirectory: string;
  }): NxProject[] {
    return args.projects.filter((project) =>
      this.configurationService.isProjectSelected({
        configuration: args.configuration,
        projectName: project.name,
        projectRoot: path.relative(args.workingDirectory, project.absoluteRoot),
        projectTags: project.tags,
      }),
    );
  }

  // 🌎 Public Methods

  /**
   * Reads the configuration and the project graph a run is about to act on.
   *
   * Called once per run, by the command — every pass takes the context it
   * returns. `--check boundaries` reads exactly the same one, which is what
   * lets a single run both export and gate without reading the workspace
   * twice.
   */
  async build(args: {
    mode: CodependixRunMode;
    options: MapCommandOptions;
    workingDirectory: string;
  }): Promise<GraphRunContext> {
    const { mode, options, workingDirectory } = args;
    const configuration = await this.configurationService.loadConfiguration({
      configurationPath: options.config,
      overrides: { exclude: options.exclude, include: options.include },
      searchDirectory: workingDirectory,
      selection: { projects: options.projects, tags: options.tags },
    });
    const graph = await this.neighborhoodService.readProjectGraph(
      this.resolveProjectGraphPath(
        configuration.projectGraph,
        workingDirectory,
      ),
    );
    const projects = this.neighborhoodService.readProjects(
      graph,
      workingDirectory,
    );
    const projectConfigurations =
      await this.loadProjectConfigurations(projects);

    return {
      configuration,
      enabledGraphTypes: this.resolveEnabledGraphTypes(options),
      graph,
      mode,
      projectConfigurations,
      projects,
      selectedProjects: this.selectProjects({
        configuration,
        projects,
        workingDirectory,
      }),
      workingDirectory,
    };
  }
}
