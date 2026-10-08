import { existsSync } from "node:fs";
import path from "node:path";

import { CallidescopeService } from "@callidescope/cli";
import {
  ConfigurationService,
  DEFAULT_OUTPUT_FORMAT,
  DEFAULT_PREVIEW_COUNT,
  DEFAULT_RUN_HEADING,
} from "@callidescope/configuration";
import { FileFilterService } from "@callidescope/graph";
import {
  MarkdownReportService,
  ProjectReportsService,
} from "@callidescope/output";
import { Injectable } from "@nestjs/common";

import {
  CALLIDESCOPE_NX_PLUGIN_NAME,
  PROJECT_PROGRAM_FILENAME,
  WORKSPACE_PROJECT_ROOT,
} from "../options/options.constants";
import { OptionsService } from "../options/options.service";
import { ProjectsService } from "../projects/projects.service";
import { RunConfigurationService } from "../run-configuration/run-configuration.service";

import {
  EMPTY_TRACE_REPORT,
  PROJECT_CONFIGURATION_FILENAME,
  PROJECT_LIMITS_INPUT,
  reportUnreadProjects,
} from "./plugin.constants";

import type { CallidescopePluginOptions } from "../options/options.types";
import type {
  InferredTargets,
  InferTargetsArguments,
  ResolvedTraceScope,
  ResolveTraceScopeArguments,
  RunGateArguments,
  RunTraceArguments,
  RunTraceResult,
  RunVerdict,
} from "./plugin.types";
import type { ProjectLimitsLookup } from "@callidescope/configuration";
import type { CallGraphResult } from "@callidescope/core";
import type { FileFilter } from "@callidescope/graph";

/**
 * Everything this plugin does, behind one injectable.
 *
 * Nx calls plugins from module-level functions with no injection of their own,
 * so the bare entry points in `index.ts` and the executor build nothing
 * themselves — they resolve this service and hand it the arguments.
 */
@Injectable()
export class PluginService {
  // 🏗 Dependency Injection

  constructor(
    private readonly callidescopeService: CallidescopeService,
    private readonly configurationService: ConfigurationService,
    private readonly fileFilterService: FileFilterService,
    private readonly markdownReportService: MarkdownReportService,
    private readonly optionsService: OptionsService,
    private readonly projectReportsService: ProjectReportsService,
    private readonly projectsService: ProjectsService,
    private readonly runConfigurationService: RunConfigurationService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Builds the predicate deciding which projects the workspace configuration
   * keeps out of every trace.
   *
   * The run's own filter, built from the same two fields
   * `WorkspaceService.discoverProjects` builds it from and asked the same
   * question it asks — is this project's `tsconfig.json` excluded — so
   * inference and discovery can never disagree about which projects a run
   * covers.
   *
   * A configuration that cannot be loaded excludes nothing. This runs while Nx
   * is building the project graph, where a thrown error stops every command in
   * the workspace rather than one task; the executor loads the same file again
   * and refuses there, where a refusal is about the run that asked for it.
   */
  private async buildExclusionFilter(args: {
    configurationPath: string;
    workspaceRoot: string;
  }): Promise<FileFilter> {
    try {
      const { configuration } =
        await this.configurationService.loadConfigurationFile({
          configurationPath: args.configurationPath,
          searchDirectory: args.workspaceRoot,
        });

      return this.fileFilterService.buildFileFilter({
        exclude: configuration.exclude,
        excludeFrom: configuration.excludeFrom,
        workspaceRoot: args.workspaceRoot,
      });
    } catch {
      return { isExcluded: (): boolean => false };
    }
  }

  /**
   * Builds one project's targets, gate included unless it is excluded.
   *
   * An excluded project gets the three that print something and not the one
   * that decides an exit code. Its own code is never traced — discovery drops
   * it before its `tsconfig.json` is opened — so a gate there would own no
   * finding at all and report green for a project it never read.
   * `projects/ic-suite/callidescope/callidescope-examples` is the case: its fixtures exist to breach
   * the limits, which is why `.callidescopeignore` names it.
   *
   * That sentence is what `runTrace`'s exemption from the unread rule keeps
   * true: such a project reads nothing of its own by definition, so a trace
   * failing on that would hand it a permanently red target.
   */
  private buildInferredTargets(args: {
    isExcluded: boolean;
    pluginOptions: CallidescopePluginOptions;
  }): InferredTargets {
    const { pluginOptions } = args;
    // The configured limits decide whether a run passes, so a cache hit taken
    // across an edit to them would report the old verdict. A dependency's
    // sources join them through `^default`, because the trace follows the Nx
    // graph into them even though the verdict does not.
    const inputs = [
      "default",
      "^default",
      `{workspaceRoot}/${pluginOptions.configurationPath}`,
    ];
    const targets: InferredTargets = {
      [pluginOptions.breadthTargetName]: {
        cache: true,
        executor: `${CALLIDESCOPE_NX_PLUGIN_NAME}:breadth`,
        inputs,
        options: {},
      },
      [pluginOptions.depthTargetName]: {
        cache: true,
        executor: `${CALLIDESCOPE_NX_PLUGIN_NAME}:depth`,
        inputs,
        options: {},
      },
      [pluginOptions.traceTargetName]: {
        cache: true,
        executor: `${CALLIDESCOPE_NX_PLUGIN_NAME}:trace`,
        inputs,
        options: {},
      },
    };

    if (args.isExcluded) {
      return targets;
    }

    return {
      ...targets,
      [pluginOptions.gateTargetName]: {
        cache: true,
        executor: `${CALLIDESCOPE_NX_PLUGIN_NAME}:gate`,
        inputs: [...inputs, PROJECT_LIMITS_INPUT],
        options: {},
      },
    };
  }

  /**
   * The block a verdict owes the reader when its findings cannot explain it.
   *
   * Both targets print this and only one fails on it — see `judge` — because
   * an unread project is a fact about the run either way. The unread projects
   * come first when both apply: they name what went missing, where the
   * whole-run reason can only say that something did.
   */
  private explainVerdict(verdict: RunVerdict): string | undefined {
    if (verdict.unreadProjectNames.length > 0) {
      return reportUnreadProjects(verdict.unreadProjectNames);
    }

    return verdict.reason;
  }

  /** Whether a project's directory holds a TypeScript program to trace. */
  private holdsProgram(args: {
    projectRoot: string;
    workspaceRoot: string;
  }): boolean {
    return existsSync(
      path.join(args.workspaceRoot, args.projectRoot, PROJECT_PROGRAM_FILENAME),
    );
  }

  /**
   * Whether the workspace configuration excludes this project outright.
   *
   * The project's own `tsconfig.json` is the path asked about, because that is
   * the path `WorkspaceService.discoverProjects` asks about — a project is
   * excluded when the file that makes it a project is.
   *
   * Joined with `path.posix` rather than `path.join`, unlike `holdsProgram`
   * beside it: a filter matches the workspace-relative POSIX paths git and the
   * exclusion globs are written in, where `holdsProgram` hands `existsSync` a
   * native absolute path.
   */
  private isExcludedProject(args: {
    fileFilter: FileFilter;
    projectRoot: string;
  }): boolean {
    return args.fileFilter.isExcluded(
      path.posix.join(args.projectRoot, PROJECT_PROGRAM_FILENAME),
    );
  }

  /**
   * Decides whether a traced result passes, for every target that reads one.
   *
   * One predicate rather than the same expression beside each caller, so a
   * rule added here cannot reach one verdict and miss the other.
   *
   * **Only the projects the run was scoped to are judged.** A trace reaches
   * into the dependencies of what it was pointed at, so judging the whole
   * run's findings would fail `alpha`'s task for a breach in `beta`. The same
   * line the publishing side already draws, one step further along:
   * measurement reaches into dependencies, publishing does not, and judging
   * does not either. A dependency's breach is its own gate's business, and
   * `nx affected` selects it too when it changes, so nothing escapes a verdict.
   *
   * **A judged project none of whose own files were read is named back**, the
   * case `callidescope`'s own `reportEmptyTrace` fails for the same reason: a
   * gate that passes because it never looked reports the project as clean.
   * Asked of each judged project rather than of the whole run, because
   * narrowing made those two different questions — a project with dependencies
   * has a non-empty run whatever became of its own sources, so its own
   * `exclude` over-matching would otherwise leave it owning no finding and
   * passing green. The whole run is asked too, for a run judging no project at
   * all.
   *
   * It is the one rule whose **consequence** is the caller's rather than this
   * predicate's, and so the one thing `unreadProjectNames` is returned beside
   * `ok` for: a `gate` fails on it and a `trace` prints it and passes. Every
   * project the workspace configuration excludes reads nothing of its own and
   * is denied a gate while keeping its trace, so failing the trace too would
   * make that project's target permanently red for being configured exactly as
   * it was asked to be. Finding the projects stays here either way, so the
   * rule cannot be applied to one verdict and forgotten by the other.
   *
   * **Depth is judged always, breadth wherever a limit exists** — not two
   * modes to be selected between. `maximumDepth` has a default and
   * `maximumBreadth` has none at any level, so a project declaring no breadth
   * limit can produce no breadth finding to fail on. Reading the findings
   * rather than naming a check is what keeps that true without a decision.
   */
  private judge(args: {
    judgedProjectNames: readonly string[];
    projectLimits: ProjectLimitsLookup;
    result: CallGraphResult;
  }): RunVerdict {
    const findings = this.projectReportsService.findOwnedFindings({
      limits: args.projectLimits,
      projectNames: args.judgedProjectNames,
      reports: args.result.projects,
    });
    const unreadProjectNames = this.projectReportsService.findUnreadProjects({
      projectNames: args.judgedProjectNames,
      reports: args.result.projects,
    });

    if (args.result.summary.callableCount === 0) {
      return {
        findings,
        ok: false,
        reason: EMPTY_TRACE_REPORT,
        unreadProjectNames,
      };
    }

    return {
      findings,
      ok:
        findings.deepStacks.length === 0 && findings.wideCallables.length === 0,
      reason: undefined,
      unreadProjectNames,
    };
  }

  // 🌎 Public Methods

  /**
   * States what a selection asked for that the workspace does not have.
   *
   * Both kinds of mistake are named at once, each beside the vocabulary it
   * was drawn from, so a command line with two typos in it is two typos to
   * fix rather than two runs.
   */
  public describeRefusedScope(scope: ResolvedTraceScope): string {
    return [
      scope.unknownNames.length > 0
        ? `Unknown Nx projects: ${scope.unknownNames.join(", ")}. Known: ${scope.knownNames.join(", ")}.`
        : undefined,
      scope.unmatchedTags.length > 0
        ? `Unmatched Nx tags: ${scope.unmatchedTags.join(", ")}. Known: ${scope.knownTags.join(", ")}.`
        : undefined,
    ]
      .filter((reason) => reason !== undefined)
      .join(" ");
  }

  /**
   * Infers this plugin's targets onto every project holding a `tsconfig.json`.
   *
   * A project with no program of its own is skipped rather than given a target
   * that would trace nothing — `callidescope` warns and moves on, so an
   * inferred target there would be a permanently empty report. The
   * workspace-root project is skipped for the opposite reason: it contains
   * every other project, so its target would trace the whole workspace under
   * one uncacheable task.
   *
   * Asynchronous because the gate is only inferred onto a project the
   * workspace configuration does not exclude, and only that file can say which
   * projects those are — see `buildExclusionFilter`, which is read once here
   * rather than once per project for the same reason the plugin options are.
   */
  public async inferTargets(
    args: InferTargetsArguments,
  ): Promise<Map<string, InferredTargets>> {
    const pluginOptions = this.optionsService.resolvePluginOptions(
      args.options,
    );
    const fileFilter = await this.buildExclusionFilter({
      configurationPath: pluginOptions.configurationPath,
      workspaceRoot: args.workspaceRoot,
    });
    const targetsByProjectRoot = new Map<string, InferredTargets>();

    for (const projectConfigurationFile of args.projectConfigurationFiles) {
      if (
        path.basename(projectConfigurationFile) !==
        PROJECT_CONFIGURATION_FILENAME
      ) {
        continue;
      }

      const projectRoot = path.dirname(projectConfigurationFile);

      if (
        projectRoot === WORKSPACE_PROJECT_ROOT ||
        !this.holdsProgram({ projectRoot, workspaceRoot: args.workspaceRoot })
      ) {
        continue;
      }

      targetsByProjectRoot.set(
        projectRoot,
        this.buildInferredTargets({
          isExcluded: this.isExcludedProject({ fileFilter, projectRoot }),
          pluginOptions,
        }),
      );
    }

    return targetsByProjectRoot;
  }

  /**
   * Resolves an executor's `projects`/`tags` selection into directories.
   *
   * The selection is widened along the Nx dependency graph unless asked not to
   * be — see `ProjectsService.resolveDependencyClosure` for why a trace that
   * stops at a project's own boundary measures the wrong thing. Two sets of
   * directories come back for that reason: what the widened selection reads,
   * and what the selection itself is answerable for.
   */
  public async resolveTraceScope(
    args: ResolveTraceScopeArguments,
  ): Promise<ResolvedTraceScope> {
    const graph = await this.projectsService.readProjectGraph();
    const selected = this.projectsService.resolveProjectNames({
      graph,
      projectNames: args.projectNames,
      tags: args.tags,
    });
    const projectNames = args.withDependencies
      ? this.projectsService.resolveDependencyClosure({
          graph,
          projectNames: selected.projectNames,
        })
      : selected.projectNames;

    return {
      directories: this.projectsService.resolveDirectories({
        graph,
        projectNames,
      }).directories,
      knownNames: selected.knownNames,
      knownTags: selected.knownTags,
      projectNames,
      selectedDirectories: this.projectsService.resolveDirectories({
        graph,
        projectNames: selected.projectNames,
      }).directories,
      unknownNames: selected.unknownNames,
      unmatchedTags: selected.unmatchedTags,
    };
  }

  /**
   * Traces the resolved directories and judges what it found against the
   * limits every project in scope declared.
   *
   * The verdict is `judge`'s, which is where the rules are written; this
   * chooses what to print for it — the findings it judged, or, for a run that
   * read nothing and so has none to show, the reason it failed instead.
   *
   * The one thing it adds to that verdict is the exit code for an unread
   * judged project, which is the gate's alone — see `judge`.
   */
  public async runGate(args: RunGateArguments): Promise<RunTraceResult> {
    const { configuration, path: configurationPath } =
      await this.runConfigurationService.load(args);
    const outcome = await this.callidescopeService.trace({
      configuration,
      configurationPath,
      directories: args.directories,
      workspaceRoot: args.workspaceRoot,
    });
    const verdict = this.judge({
      judgedProjectNames: args.judgedProjectNames,
      projectLimits: outcome.projectLimits,
      result: outcome.result,
    });

    return {
      ok: verdict.ok && verdict.unreadProjectNames.length === 0,
      report:
        this.explainVerdict(verdict) ??
        this.markdownReportService.renderFindings({
          ...verdict.findings,
          // Returned to an executor to print rather than spliced into a
          // document, so no destination's count applies.
          previewCount: DEFAULT_PREVIEW_COUNT,
        }),
    };
  }

  /**
   * Traces the resolved directories and renders the report.
   *
   * This is the whole of the "logic on top of core callidescope": the
   * selection above is Nx's to resolve, and everything below this line is
   * callidescope's own, reached through the same services the `callidescope`
   * command uses rather than through a subprocess.
   *
   * Judged by the same predicate the gate is, so the two targets cannot come
   * to disagree about what a passing run is. A run that read nothing keeps its
   * report and gains the reason underneath it: a summary table of zeroes is
   * what happened, not why it failed.
   *
   * The one rule the two act on differently: a judged project none of whose
   * own files were read is **printed here and not failed on**, where a gate
   * fails — see `judge` for why that is the one exemption.
   */
  public async runTrace(args: RunTraceArguments): Promise<RunTraceResult> {
    const { configuration, path: loadedPath } =
      await this.runConfigurationService.load(args);
    // Presentation rather than declared: the console format is a
    // per-invocation choice this executor's own flag makes, never something
    // a configuration file writes down.
    const format = args.format ?? DEFAULT_OUTPUT_FORMAT;

    const outcome = await this.callidescopeService.trace({
      configuration,
      configurationPath: loadedPath,
      directories: args.directories,
      workspaceRoot: args.workspaceRoot,
    });

    const verdict = this.judge({
      judgedProjectNames: args.judgedProjectNames,
      projectLimits: outcome.projectLimits,
      result: outcome.result,
    });
    const report = this.markdownReportService.renderRun({
      // Returned to an executor to print, not spliced into a file, so there is
      // no destination to take a heading or a description from.
      description: undefined,
      heading: DEFAULT_RUN_HEADING,
      limits: outcome.projectLimits,
      previewCount: DEFAULT_PREVIEW_COUNT,
      rendering: format === "mermaid" ? "diagram" : "tree",
      result: outcome.result,
    });
    const explanation = this.explainVerdict(verdict);

    return {
      ok: verdict.ok,
      report: explanation === undefined ? report : `${report}\n${explanation}`,
    };
  }
}
