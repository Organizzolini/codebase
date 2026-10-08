import { ConfigurationService } from "@callidescope/configuration";
import {
  CallablesService,
  ClassesService,
  EntriesService,
  ExternalService,
  FileFilterService,
  GraphAssemblyService,
  ProgramService,
  WorkspaceService,
} from "@callidescope/graph";
import { ProjectReportsService } from "@callidescope/output";
import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import { INCLUDE_CONSTRUCTOR_EDGES } from "./callidescope.constants";

import type {
  AnalyzeOutcome,
  DiscoveredWorkspace,
  LocateOutcome,
  ProjectDeclarations,
  TraceArguments,
  TraceOutcome,
} from "./callidescope.types";
import type {
  CallidescopeLimitOverrides,
  CallidescopeLimits,
  ProjectLimitsLookup,
  ResolvedCallidescopeConfiguration,
  ResolvedCallidescopeEntryPoints,
} from "@callidescope/configuration";
import type { CallableId, CallGraphSummary } from "@callidescope/core";
import type {
  DepthMeasurement,
  DiscoveredCallable,
  FileFilter,
  ProgramSet,
  WorkspaceProject,
} from "@callidescope/graph";

/**
 * Runs one trace of a workspace, from tsconfig files to findings.
 */
@Injectable()
export class CallidescopeService {
  // 🏗 Dependency Injection

  constructor(
    private readonly callablesService: CallablesService,
    private readonly classHierarchyService: ClassesService,
    private readonly entryPointsService: EntriesService,
    private readonly externalService: ExternalService,
    private readonly fileFilterService: FileFilterService,
    private readonly graphAssemblyService: GraphAssemblyService,
    private readonly programService: ProgramService,
    private readonly configurationService: ConfigurationService,
    private readonly projectReportsService: ProjectReportsService,
    private readonly workspaceService: WorkspaceService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(CallidescopeService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Walks the workspace and collects every callable, without analyzing them.
   *
   * Shared by `trace`, which goes on to run the full analysis, and `locate`,
   * which only needs the collected callables and their graph to resolve one
   * address — entry points and project reports are work `locate`'s callers
   * never asked for. Both read the same declarations, because a
   * project's own `exclude` decides which files exist to be collected at all,
   * and an address resolved against a different set of files from the one a
   * gated run measures would be an address about a different codebase.
   */
  private async discoverCallables(
    args: TraceArguments,
  ): Promise<DiscoveredWorkspace> {
    const { fileFilter, programSet, projects, startingProjects } =
      this.discoverPrograms(args);
    const projectNames = projects.map((project) => project.name);
    // Between discovery and collection, which is the only moment either
    // answer can be had: a project's own file sits at a root discovery is
    // what finds, and its `exclude` decides what collection may look at.
    const declarations = await this.loadProjectDeclarations({
      authoredLimits: args.authoredLimits,
      configuration: args.configuration,
      configurationPath: args.configurationPath,
      limitOverrides: args.limitOverrides,
      projectNames,
      workspaceRoot: args.workspaceRoot,
    });

    this.externalService.configure({
      ownedFilePaths: new Set(programSet.ownerByFilePath.keys()),
      workspaceRoot: args.workspaceRoot,
    });
    this.classHierarchyService.build({ programs: programSet.programs });

    const collection = this.callablesService.collect({
      fileFilter: this.fileFilterService.buildProjectFileFilter({
        excludeByProject: declarations.excludeByProject,
        fileFilter,
        projects,
      }),
      includeTests: args.configuration.entryPoints.includeTests,
      // The fifth `entryPoints` field, read here rather than beside the other
      // four: the rest decide which of the collected callables root a stack,
      // and this one decides whether a file is collected at all — so it is
      // spent at collection, the same layer a project's `exclude` is.
      includeTestsByProject: new Map(
        [...declarations.entryPointsByProject].map(([project, entryPoints]) => [
          project,
          entryPoints.includeTests,
        ]),
      ),
      ownerByFilePath: programSet.ownerByFilePath,
      workspaceRoot: args.workspaceRoot,
    });

    return {
      ...declarations,
      collection,
      projectNames,
      // The starting projects rather than the closure: measurement reaches
      // into a project's dependencies, publishing does not. A run scoped to
      // one package would otherwise rewrite a section in every README its
      // imports happened to reach, which is a whole-workspace run's job.
      startingProjectRoots: new Map(
        startingProjects.map((project) => [project.name, project.root]),
      ),
    };
  }

  /**
   * Finds the projects a run covers and builds a program for each.
   *
   * Split from `discoverCallables` because the projects have to exist before
   * anything can be read from beside them, and the run's own filter has to
   * exist before the projects: a project the run excludes must be dropped
   * before its `tsconfig.json` is opened, since opening it is what fails.
   */
  private discoverPrograms(args: TraceArguments): {
    fileFilter: FileFilter;
    programSet: ProgramSet;
    projects: WorkspaceProject[];
    startingProjects: WorkspaceProject[];
  } {
    const fileFilter = this.fileFilterService.buildFileFilter({
      exclude: args.configuration.exclude,
      excludeFrom: args.configuration.excludeFrom,
      workspaceRoot: args.workspaceRoot,
    });
    const startingProjects = this.workspaceService.discoverProjects({
      directories: args.directories,
      fileFilter,
      workspaceRoot: args.workspaceRoot,
    });
    // A run naming no directory already asked for every project, so the walk
    // that would find them again is the one it just did.
    const workspaceProjects =
      args.directories.length === 0
        ? startingProjects
        : this.workspaceService.discoverProjects({
            directories: [],
            fileFilter,
            workspaceRoot: args.workspaceRoot,
          });
    const programSet = this.programService.buildPrograms({
      startingProjects,
      workspaceProjects,
      workspaceRoot: args.workspaceRoot,
    });

    return {
      fileFilter,
      programSet,
      // The closure rather than the starting roots: a scoped run traces the
      // projects its imports reach as well, so a call into a dependency lands
      // on a frame instead of stopping at the package boundary.
      projects: programSet.programs.map(
        (projectProgram) => projectProgram.project,
      ),
      startingProjects,
    };
  }

  /**
   * Reads what each traced project declared for itself: the callables that
   * root its stacks, and the limits those stacks are judged against.
   *
   * Over the whole closure rather than the projects the run was pointed at: a
   * dependency's callables are measured by this run, and the project that owns
   * them is the one entitled to say what roots a stack through them. A run
   * scoped elsewhere would otherwise judge them by whoever happened to reach
   * them.
   *
   * One load for both, because the two answers come out of the same files, and
   * reading those files twice is how a run ends up gating against limits from
   * one read and rooting stacks from another.
   *
   * A project declaring no entry-point rules is simply absent from that map,
   * and `EntriesService` falls back to the run's own configuration for it —
   * which is why this returns rules rather than a whole configuration. Limits
   * resolve the other way round, naming every project, because a limit has to
   * be printable per project whether or not the project chose it.
   *
   * Exclusions are read from the file exactly as authored rather than from the
   * resolved configuration, which is the split `readDeclaredLimit` already makes
   * for
   * a limit: resolution folds the tool's own default globs into every project's
   * `exclude`, so the resolved array can never say whether this project
   * excluded anything. A project that excluded nothing is left out of the map
   * entirely, so a run in which no project excludes anything is handed back the
   * run's own filter untouched.
   */
  private async loadProjectDeclarations(args: {
    authoredLimits: CallidescopeLimits | undefined;
    configuration: ResolvedCallidescopeConfiguration;
    configurationPath: string | undefined;
    limitOverrides: CallidescopeLimitOverrides | undefined;
    projectNames: readonly string[];
    workspaceRoot: string;
  }): Promise<ProjectDeclarations> {
    const loaded = await this.configurationService.loadProjectConfigurations({
      projects: args.projectNames,
      workspaceConfigurationPath: args.configurationPath,
      workspaceRoot: args.workspaceRoot,
    });

    return {
      entryPointsByProject: new Map(
        loaded.map((projectConfiguration) => [
          projectConfiguration.project,
          projectConfiguration.configuration.entryPoints,
        ]),
      ),
      excludeByProject: new Map(
        loaded
          .filter(
            (projectConfiguration) =>
              (projectConfiguration.authored.exclude ?? []).length > 0,
          )
          .map((projectConfiguration) => [
            projectConfiguration.project,
            projectConfiguration.authored.exclude ?? [],
          ]),
      ),
      projectLimits: this.configurationService.resolveLimits({
        limitOverrides: args.limitOverrides,
        projectConfigurations: loaded,
        projects: args.projectNames,
        workspaceAuthoredLimits: args.authoredLimits,
        workspaceConfiguration: args.configuration,
        workspaceConfigurationPath: args.configurationPath,
      }),
      // Every loaded project, unfiltered: a complete configuration always
      // names both destinations, so a project publishing nothing wrote
      // `markdown: undefined` rather than being absent here. There is no
      // fan-out left for an absence to fall through to.
      writeByProject: new Map(
        loaded.map((projectConfiguration) => [
          projectConfiguration.project,
          projectConfiguration.configuration.write,
        ]),
      ),
    };
  }

  /**
   * Reads the deepest depth any component reached, closure included.
   *
   * The whole trace's number, closure included, which is what belongs in a
   * summary describing everything a run measured. It is **not** what a scoped
   * run is judged on, which is why the log line names it `maximumDepthTraced`
   * rather than `maximumDepth`.
   */
  private readMaximumDepth(measurement: DepthMeasurement): number {
    return measurement.byComponent.reduce(
      (deepest, entry) => Math.max(deepest, entry.depth),
      0,
    );
  }

  // 🌎 Public Methods

  /** Derives every finding from the collected callables. */
  public analyze(args: {
    callablesById: ReadonlyMap<CallableId, DiscoveredCallable>;
    configuration: ResolvedCallidescopeConfiguration;
    /** Entry-point rules a project declared for itself, keyed by project name. */
    entryPointsByProject: ReadonlyMap<string, ResolvedCallidescopeEntryPoints>;
    fileCount: number;
    fileCountByProject: ReadonlyMap<string, number>;
    projectCount: number;
    /** The depth and breadth limits each traced project is judged against. */
    projectLimits: ProjectLimitsLookup;
    projectNames: readonly string[];
    workspaceRoot: string;
  }): AnalyzeOutcome {
    const { breadthMeasurement, condensed, graph, measurement } =
      this.graphAssemblyService.assemble({
        callablesById: args.callablesById,
        excludeCallees: args.configuration.excludeCallees,
        includeConstructorEdges: INCLUDE_CONSTRUCTOR_EDGES,
        workspaceRoot: args.workspaceRoot,
      });
    const entryPoints = this.entryPointsService.resolve({
      callablesById: args.callablesById,
      entryPoints: args.configuration.entryPoints,
      entryPointsByProject: args.entryPointsByProject,
      graph,
      workspaceRoot: args.workspaceRoot,
    });
    const projects = this.projectReportsService.build({
      breadthMeasurement,
      callablesById: args.callablesById,
      condensed,
      entryPoints,
      fileCountByProject: args.fileCountByProject,
      graph,
      measurement,
      projectNames: args.projectNames,
    });

    const summary: CallGraphSummary = {
      callableCount: args.callablesById.size,
      cyclicComponentCount: condensed.memberIdsByComponent.filter(
        (members) => members.length > 1,
      ).length,
      edgeCount: graph.edges.length,
      entryPointCount: entryPoints.entryPoints.length,
      fileCount: args.fileCount,
      maximumDepth: this.readMaximumDepth(measurement),
      projectCount: args.projectCount,
      unresolvedCallCount: graph.unresolvedCalls.length,
    };

    // `maximumDepthTraced`, never `maximumDepth`. A scoped run builds programs
    // for its whole dependency closure, so this number routinely belongs to a
    // project the run was never pointed at — `projects/synchronization` printed a
    // traced seventeen while owning ten. Under the bare name it reads as the
    // number to write into that project's own limit, which would be headroom:
    // a limit above what a project measures gates nothing while claiming to
    // have been measured. The name is the whole fix — the owned number is a
    // gate's verdict to give, and `depth` and `breadth` report it per project.
    this.logger.info("🔭 Finished an analysis", undefined, {
      callableCount: summary.callableCount,
      edgeCount: summary.edgeCount,
      entryPointCount: summary.entryPointCount,
      maximumDepthTraced: summary.maximumDepth,
    });

    return {
      projectLimits: args.projectLimits,
      result: {
        deepStacks: this.projectReportsService.findDeepStacks({
          limits: args.projectLimits,
          reports: projects,
        }),
        projects,
        summary,
        wideCallables: this.projectReportsService.findWideCallables({
          limits: args.projectLimits,
          reports: projects,
        }),
      },
      unresolvedAddresses: entryPoints.unresolvedAddresses,
    };
  }

  /**
   * Collects every callable and assembles the graph over them, without
   * running the analysis a full trace does.
   *
   * For the `depth` and `breadth` commands, which resolve one address against
   * the collected callables and then walk the graph from it — neither needs
   * entry points or project reports, both of which `analyze` builds
   * unconditionally.
   *
   * Asynchronous because discovery is: every project's own configuration is
   * read before a callable is collected, since a project's `exclude` decides
   * which files there are to collect. The limits those same files declare are
   * loaded and thrown away here, which is the price of one answer about what a
   * run's callables are rather than two.
   */
  public async locate(args: TraceArguments): Promise<LocateOutcome> {
    const { collection, startingProjectRoots } =
      await this.discoverCallables(args);
    const { graph } = this.graphAssemblyService.assemble({
      callablesById: collection.byId,
      excludeCallees: args.configuration.excludeCallees,
      includeConstructorEdges: INCLUDE_CONSTRUCTOR_EDGES,
      workspaceRoot: args.workspaceRoot,
    });

    return { callablesById: collection.byId, graph, startingProjectRoots };
  }

  /** Traces a workspace and returns everything the run found. */
  public async trace(args: TraceArguments): Promise<TraceOutcome> {
    this.logger.info("🔭 Tracing a workspace", undefined, {
      workspaceRoot: args.workspaceRoot,
    });

    const {
      collection,
      entryPointsByProject,
      projectLimits,
      projectNames,
      startingProjectRoots,
      writeByProject,
    } = await this.discoverCallables(args);
    const analyzed = this.analyze({
      callablesById: collection.byId,
      configuration: args.configuration,
      entryPointsByProject,
      fileCount: collection.fileCount,
      fileCountByProject: collection.fileCountByProject,
      projectCount: projectNames.length,
      projectLimits,
      projectNames,
      workspaceRoot: args.workspaceRoot,
    });

    return {
      ...analyzed,
      projectNames,
      startingProjectRoots,
      writeByProject,
    };
  }
}
