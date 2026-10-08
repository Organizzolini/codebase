import path from "node:path";

import { Injectable } from "@nestjs/common";

import { InputService } from "../input/input.service";
import { OverrideResolutionService } from "../override-resolution/override-resolution.service";

import { ConfigurationLoaderService } from "./configuration-loader.service";
import {
  codependixProjectConfigurationSchema,
  DEFAULT_EXPORT_TARGET,
  DEFAULT_INCLUDE_GLOBS,
  DEFAULT_MARKDOWN_PATH,
  SELECTION_SEPARATOR,
  SUPPORTED_CONFIGURATION_EXTENSIONS,
  UnknownConfigurationFileTypeError,
} from "./configuration.constants";
import { FlagResolutionService } from "./flag-resolution.service";

import type {
  CodependixBoundariesConfiguration,
  CodependixConfiguration,
  CodependixGraphOutput,
  CodependixGraphType,
  CodependixProjectConfiguration,
  CodependixSelectionArguments,
  LoadConfigurationArguments,
  LoadProjectConfigurationArguments,
  MapCommandOptions,
  ProjectSelectionArguments,
  ResolvedCodependixBoundariesConfiguration,
  ResolvedCodependixConfiguration,
  ResolvedCodependixGraphOutput,
  ResolvedCodependixSelection,
  ResolveForProjectArguments,
} from "./configuration.types";
import type { RunMode, RunModeSelection } from "@codependix/core";

/**
 * Loads, validates, and resolves codependix configuration files.
 *
 * Loading and per-project resolution are kept apart on purpose: a project's
 * actual export configuration depends on both the global defaults and its own
 * name, so resolving it eagerly for every project in the workspace would mean
 * redoing that work for a workspace whose graphs run against a filtered subset
 * of projects. `resolveForProject` is called once per project that is
 * actually built instead.
 */
@Injectable()
export class ConfigurationService {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationLoaderService: ConfigurationLoaderService,
    private readonly flagResolutionService: FlagResolutionService,
    private readonly inputService: InputService,
    private readonly overrideResolutionService: OverrideResolutionService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Whether `--projects` or `--tags` names a project. */
  private isProjectNamedOnCommandLine(
    args: ProjectSelectionArguments,
  ): boolean {
    const { selection } = args.configuration;

    return (
      this.matchesAnyName(
        args.projectName,
        args.projectRoot,
        selection.projects,
      ) || (args.projectTags ?? []).some((tag) => selection.tags.includes(tag))
    );
  }

  /** Whether a project's name matches at least one of a list of globs. */
  private matchesAnyGlob(projectName: string, globs: string[]): boolean {
    return globs.some((glob) => path.matchesGlob(projectName, glob));
  }

  /** Whether a project's name or its root matches at least one glob. */
  private matchesAnyName(
    projectName: string,
    projectRoot: string | undefined,
    globs: string[],
  ): boolean {
    return (
      this.matchesAnyGlob(projectName, globs) ||
      (projectRoot !== undefined && this.matchesAnyGlob(projectRoot, globs))
    );
  }

  /**
   * Fills in every graph level a `boundaries` block may leave out.
   *
   * Every level resolves to a list rather than to `undefined`, so a caller
   * walks all of them without asking which ones were configured — the same
   * reason `include` resolves to a list nobody wrote. `fileImports` resolves
   * both of its languages the same way, one level deeper.
   */
  private resolveBoundaries(
    boundaries: CodependixBoundariesConfiguration | undefined,
  ): ResolvedCodependixBoundariesConfiguration {
    return {
      fileImports: {
        python: boundaries?.fileImports?.python ?? [],
        typescript: boundaries?.fileImports?.typescript ?? [],
      },
      nestjsModules: boundaries?.nestjsModules ?? [],
      nxProjects: boundaries?.nxProjects ?? [],
    };
  }

  /** Applies defaults to one graph type's export configuration. */
  private resolveGraphOutput(
    output: CodependixGraphOutput | undefined,
  ): ResolvedCodependixGraphOutput {
    const target = output?.target ?? DEFAULT_EXPORT_TARGET;
    const markdown = output?.markdown;

    return {
      json: output?.json === undefined ? undefined : { path: output.json.path },
      markdown:
        markdown === undefined
          ? undefined
          : {
              anchor: markdown.anchor,
              path: markdown.path ?? DEFAULT_MARKDOWN_PATH,
            },
      target,
    };
  }

  // 🌎 Public Methods

  /**
   * Splits the `--projects` and `--tags` arguments into lists.
   *
   * Empty entries are dropped, so a trailing comma and a doubled one are both
   * read as the author meant them rather than as a glob matching nothing.
   */
  private resolveSelection(
    selection: CodependixSelectionArguments | undefined,
  ): ResolvedCodependixSelection {
    return {
      projects: this.splitSelectionArgument(selection?.projects),
      tags: this.splitSelectionArgument(selection?.tags),
    };
  }

  /** Splits one comma-separated argument, trimming and dropping blanks. */
  private splitSelectionArgument(argument: string | undefined): string[] {
    return (argument ?? "")
      .split(SELECTION_SEPARATOR)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  /**
   * Whether a project participates in graph export at all.
   *
   * A project matches when something claims it — an `include` glob, a
   * `--projects` glob, or a `--tags` tag — and no `exclude` glob claims its
   * name or root. The command line **widens** what the configuration already
   * selects rather than replacing it; `exclude` wins over all three, because
   * a flag that could resurrect an excluded project would make `exclude`
   * advisory.
   *
   * `projectRoot` and `projectTags` are optional: a caller with neither handy
   * still resolves against globs written against project names.
   */
  public isProjectIncluded(args: ProjectSelectionArguments): boolean {
    const { configuration, projectName, projectRoot } = args;
    const isIncluded =
      this.matchesAnyName(projectName, projectRoot, configuration.include) ||
      this.isProjectNamedOnCommandLine(args);
    const isExcluded = this.matchesAnyName(
      projectName,
      projectRoot,
      configuration.exclude,
    );

    return isIncluded && !isExcluded;
  }

  /**
   * Whether a project is in the set a run's command line narrowed to.
   *
   * A run naming no selection selects **everything**, which is what keeps the
   * whole-workspace graph and the boundary gate judging every project by
   * default. Naming one narrows both to what it named.
   *
   * This is where `--projects`/`--tags` differ from `include`: `include` is
   * about which projects have exports written for them, and never reaches the
   * workspace graph or the gate. A selection reaches all three.
   */
  public isProjectSelected(args: ProjectSelectionArguments): boolean {
    const { selection } = args.configuration;

    if (selection.projects.length === 0 && selection.tags.length === 0) {
      return true;
    }

    return this.isProjectNamedOnCommandLine(args);
  }

  /**
   * Loads and validates a codependix configuration file.
   *
   * A path that was named explicitly must exist — a typo in a task runner's
   * arguments should fail rather than quietly resolving every graph to
   * `target: "none"`. A path that was not named is searched for from the
   * search directory upward, and its absence is legal.
   */
  public async loadConfiguration(
    args: LoadConfigurationArguments = {},
  ): Promise<ResolvedCodependixConfiguration> {
    const authored =
      await this.configurationLoaderService.readAuthoredConfiguration(args);

    return this.overrideResolutionService.applyOverrides({
      authored,
      overrides: args.overrides,
      resolved: this.resolveConfiguration(authored, args.selection),
    });
  }

  /**
   * Loads and validates one project's own `codependix.config.ts`, or
   * `undefined` when it has none.
   *
   * Searched for exactly at `projectRoot` — see
   * `ConfigurationLoaderService.findProjectConfigurationFile` — rather than
   * the upward search `loadConfiguration` performs for the workspace root's
   * own file: a project's file is either colocated with it or it does not
   * exist, and a project with none produces no per-project output rather than
   * inheriting one from a parent directory.
   */
  public async loadProjectConfiguration(
    args: LoadProjectConfigurationArguments,
  ): Promise<CodependixProjectConfiguration | undefined> {
    const projectRoot = path.resolve(args.projectRoot);
    const resolvedPath =
      this.configurationLoaderService.findProjectConfigurationFile(projectRoot);

    if (resolvedPath === undefined) {
      return undefined;
    }

    const extension = path.extname(resolvedPath).toLowerCase();

    if (!SUPPORTED_CONFIGURATION_EXTENSIONS.has(extension)) {
      throw new UnknownConfigurationFileTypeError(resolvedPath);
    }

    const configurationModule =
      await this.configurationLoaderService.loadConfigurationModule({
        configurationPath: resolvedPath,
        extension,
      });

    return codependixProjectConfigurationSchema.parse(configurationModule);
  }

  /**
   * Parses a comma-separated list option, dropping blank entries.
   *
   * One of the six command-line methods this service forwards to the
   * `input` and flag-resolution providers it owns. They are stated here
   * rather than exported alongside it because this package makes exactly one
   * service public: a host asking what a run is configured to do — from its
   * configuration file or from its flags — asks `ConfigurationService`.
   */
  public parseCommaDelimitedOption(value: string | undefined): string[] {
    return this.inputService.parseCommaDelimitedOption(value);
  }

  /** Parses a valueless boolean flag, which is present or it is not. */
  public parseFlagOption(value: boolean | undefined): boolean {
    return this.inputService.parseFlagOption(value);
  }

  /** Trims an optional string option, treating blank as absent. */
  public parseOptionalOption(value: string | undefined): string | undefined {
    return this.inputService.parseOptionalOption(value);
  }

  /** Parses a path option that falls back to the working directory. */
  public parsePathOption(value: string | undefined): string {
    return this.inputService.parsePathOption(value);
  }

  /**
   * Fills in every field a configuration file may leave out.
   *
   * Exposed so a host embedding codependix can hand over a configuration
   * object it assembled itself and get the same shape a configuration file
   * produces.
   */
  public resolveConfiguration(
    configuration: CodependixConfiguration,
    selection?: CodependixSelectionArguments,
  ): ResolvedCodependixConfiguration {
    return {
      boundaries: this.resolveBoundaries(configuration.boundaries),
      exclude: configuration.exclude ?? [],
      include: configuration.include ?? [...DEFAULT_INCLUDE_GLOBS],
      projectGraph: configuration.projectGraph,
      selection: this.resolveSelection(selection),
      workspace: configuration.workspace ?? {},
    };
  }

  /**
   * Resolves one project's export configuration for one graph type.
   *
   * A project's own `codependix.config.ts`, when it has one, is read exactly
   * as loaded — no merge against a workspace-wide default happens here, since
   * spreading the root-exported `projectDefaults` already happened when the
   * project's own file was authored. A project excluded by the configured
   * `include`/`exclude` globs, or one that has no configuration file of its
   * own at all, always resolves to `target: "none"`: the former because a
   * project excluded from graph export should not need every field rewritten
   * to `"none"` by hand, the latter because a project matched by `include`
   * with no file of its own has nothing to export, even though it still
   * contributes to the Workspace Graph and is judged by boundary rules.
   */
  public resolveForProject(
    args: ResolveForProjectArguments,
  ): ResolvedCodependixGraphOutput {
    const {
      configuration,
      graphType,
      projectConfiguration,
      projectName,
      projectRoot,
      projectTags,
    } = args;

    if (
      !this.isProjectIncluded({
        configuration,
        projectName,
        projectRoot,
        projectTags,
      })
    ) {
      return { json: undefined, markdown: undefined, target: "none" };
    }

    if (projectConfiguration === undefined) {
      return { json: undefined, markdown: undefined, target: "none" };
    }

    return this.resolveGraphOutput(projectConfiguration[graphType]);
  }

  /**
   * Resolves the Workspace Graph's export configuration for one graph type.
   *
   * A Workspace Graph is exported once for the whole repository rather than
   * once per project, so it has no per-project override and is unaffected by
   * `include`/`exclude` — those two apply only to `resolveForProject`.
   *
   * `--projects` and `--tags` do reach it, through the node set rather than
   * through this: a run naming a selection draws the graph over the projects
   * it named. Where that graph lands is still read from `workspace`, keyed by
   * `graphType`.
   */
  public resolveForWorkspace(
    configuration: ResolvedCodependixConfiguration,
    graphType: CodependixGraphType,
  ): ResolvedCodependixGraphOutput {
    return this.resolveGraphOutput(configuration.workspace[graphType]);
  }

  /**
   * Reads the flags into what the run writes and what it fails on.
   *
   * See `FlagResolutionService.selectMode` for which combinations are
   * refused and why.
   */
  public async selectMode(
    options: MapCommandOptions,
  ): Promise<RunModeSelection> {
    return this.flagResolutionService.selectMode(options);
  }

  /** Whether a run reads or rewrites the files its exports live in. */
  public touchesFiles(mode: RunMode): boolean {
    return this.flagResolutionService.touchesFiles(mode);
  }
}
