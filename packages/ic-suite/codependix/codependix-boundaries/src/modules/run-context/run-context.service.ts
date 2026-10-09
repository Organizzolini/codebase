import path from "node:path";

import {
  CODEPENDIX_GRAPH_TYPES,
  ConfigurationService,
} from "@codependix/configuration";
import { NeighborhoodService } from "@codependix/nx-projects";
import { Injectable } from "@nestjs/common";

import { emptySelectionError } from "./run-context.constants";

import type { GraphRunContext, UnmatchedSelection } from "./run-context.types";
import type {
  CodependixGraphType,
  CodependixProjectConfiguration,
  MapCommandOptions,
  ResolvedCodependixConfiguration,
} from "@codependix/configuration";
import type { CodependixRunMode } from "@codependix/core";
import type { NxProject, NxProjectGraph } from "@codependix/nx-projects";

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
   * Whether the selection a configuration carries claims one project.
   *
   * The one place a project is read into the shape `isProjectSelected`
   * matches against — its name, its root relative to the workspace, and its
   * tags — so the run's selection and the probe for an entry that matched
   * nothing cannot disagree about what a pattern matches.
   */
  private isSelectedBy(args: {
    configuration: ResolvedCodependixConfiguration;
    project: NxProject;
    workingDirectory: string;
  }): boolean {
    return this.configurationService.isProjectSelected({
      configuration: args.configuration,
      projectName: args.project.name,
      projectRoot: path.relative(
        args.workingDirectory,
        args.project.absoluteRoot,
      ),
      projectTags: args.project.tags,
    });
  }

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
   * Widens the selected projects to the set every boundary graph is built
   * over: their dependency closure, or the selection alone under
   * `--no-dependencies`.
   *
   * Only the selection is judged. The rest of the closure is built so a
   * finding the selected projects inherit from a dependency can be reported
   * against it as a note, and so an Nx edge leaving the selection is still
   * drawn. With no selection every project is selected, and the closure of
   * every project is every project.
   */
  private resolveBuildProjects(args: {
    configuration: ResolvedCodependixConfiguration;
    graph: NxProjectGraph;
    projects: NxProject[];
    selectedProjects: NxProject[];
  }): NxProject[] {
    if (!args.configuration.selection.dependencies) {
      return args.selectedProjects;
    }

    const closure = new Set(
      this.neighborhoodService.resolveDependencyClosure(
        args.graph,
        args.selectedProjects.map((project) => project.name),
      ),
    );

    return args.projects.filter((project) => closure.has(project.name));
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
   * Resolves the two project sets a run acts on: the selection it judges,
   * and the build set every boundary graph is drawn over.
   *
   * A `--projects`/`--tags` selection matching no project is refused here,
   * before any pass runs — see `emptySelectionError`. No selection at all
   * selects every project, so only a named one can come back empty.
   */
  private resolveProjectSets(args: {
    configuration: ResolvedCodependixConfiguration;
    graph: NxProjectGraph;
    projects: NxProject[];
    workingDirectory: string;
  }): Pick<GraphRunContext, "buildProjects" | "selectedProjects"> {
    const { selection } = args.configuration;
    const selectedProjects = this.selectProjects(args);

    if (
      selectedProjects.length === 0 &&
      selection.projects.length + selection.tags.length > 0
    ) {
      throw emptySelectionError(selection);
    }

    return {
      buildProjects: this.resolveBuildProjects({ ...args, selectedProjects }),
      selectedProjects,
    };
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
      this.isSelectedBy({
        configuration: args.configuration,
        project,
        workingDirectory: args.workingDirectory,
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
      selection: {
        dependencies: options.dependencies,
        projects: options.projects,
        tags: options.tags,
      },
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
      ...this.resolveProjectSets({
        configuration,
        graph,
        projects,
        workingDirectory,
      }),
      configuration,
      enabledGraphTypes: this.resolveEnabledGraphTypes(options),
      graph,
      mode,
      projectConfigurations,
      projects,
      workingDirectory,
    };
  }

  /**
   * The `--projects` patterns and `--tags` tags that matched no project.
   *
   * Each entry is probed alone, with the selection narrowed to it, so the
   * answer is exactly what that entry would have selected had it been the
   * only one given. Only meaningful for a context `build` returned: a
   * selection in which *nothing* matched never gets that far, since `build`
   * refuses it. What is left is the partial case — a misspelled name beside
   * a correct one — which the run silently narrows past, judging fewer
   * projects than were asked for.
   */
  findUnmatchedSelection(
    context: Pick<
      GraphRunContext,
      "configuration" | "projects" | "workingDirectory"
    >,
  ): UnmatchedSelection {
    const { configuration, projects, workingDirectory } = context;
    const matches = (selection: {
      projects: string[];
      tags: string[];
    }): boolean =>
      projects.some((project) =>
        this.isSelectedBy({
          configuration: {
            ...configuration,
            selection: { ...configuration.selection, ...selection },
          },
          project,
          workingDirectory,
        }),
      );

    return {
      projects: configuration.selection.projects.filter(
        (entry) => !matches({ projects: [entry], tags: [] }),
      ),
      tags: configuration.selection.tags.filter(
        (tag) => !matches({ projects: [], tags: [tag] }),
      ),
    };
  }
}
