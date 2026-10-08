import { PythonService, TypescriptService } from "@codependix/file-imports";
import {
  ModuleGraphService,
  NestjsProjectService,
} from "@codependix/nestjs-modules";
import { WorkspaceGraphService } from "@codependix/nx-projects";
import { Injectable } from "@nestjs/common";

import { BoundariesService } from "../boundaries/boundaries.service";

import {
  BOUNDARY_LEVEL_ORDER,
  WORKSPACE_SCOPE,
} from "./boundary-check.constants";
import { BoundaryFailureService } from "./boundary-failure.service";
import { BoundaryGraphService } from "./boundary-graph.service";

import type {
  BoundaryGraph,
  BoundaryViolation,
  CodependixBoundaryLevel,
} from "../boundaries/boundaries.types";
import type {
  BoundaryCheckContext,
  BoundaryCheckFailure,
  BoundaryCheckOutcome,
  BoundaryLevelOutcome,
  BoundaryVerdict,
  LevelCheckArguments,
} from "./boundary-check.types";
import type {
  CodependixBoundaryRule,
  CodependixGraphType,
  ResolvedCodependixBoundariesConfiguration,
} from "@codependix/configuration";

/**
 * Judges every level's graph against the rules declared for it.
 *
 * A level whose rule list is empty is never built at all, which is what makes
 * the gate affordable: judging the NestJS level means booting every
 * `framework:nestjs` container in preview mode, and judging the TypeScript
 * level means building a `ts.Program` per project. A workspace declaring only
 * Nx rules pays for neither.
 *
 * Nothing here writes or reads a destination. A violation goes to the console
 * and the exit code, so `--check boundaries` leaves every committed export
 * exactly as it found it — the property that lets it gate a branch, where the
 * exports are expected to be behind the workspace they describe.
 */
@Injectable()
export class BoundaryCheckService {
  // 🏗 Dependency Injection

  constructor(
    private readonly boundariesService: BoundariesService,
    private readonly boundaryFailureService: BoundaryFailureService,
    private readonly boundaryGraphService: BoundaryGraphService,
    private readonly moduleGraphService: ModuleGraphService,
    private readonly nestjsProjectService: NestjsProjectService,
    private readonly pythonService: PythonService,
    private readonly typescriptService: TypescriptService,
    private readonly workspaceGraphService: WorkspaceGraphService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * The `CodependixGraphType` each boundary level is judged under.
   *
   * Finer-grained than `CodependixGraphType` itself: `python` and
   * `typescript` both fall under `fileImports`, since `codependix-file-imports`
   * builds and exports both as one graph type even though `boundaries`
   * still nests their rules by language. `--no-file-imports` therefore skips
   * both levels together.
   */
  private graphTypeForLevel(
    level: CodependixBoundaryLevel,
  ): CodependixGraphType {
    const graphTypesByLevel: Record<
      CodependixBoundaryLevel,
      CodependixGraphType
    > = {
      nestjsModules: "nestjsModules",
      nxProjects: "nxProjects",
      python: "fileImports",
      typescript: "fileImports",
    };

    return graphTypesByLevel[level];
  }

  /**
   * Judges every charged finding: it fails the run when one of its projects
   * is judged, and is a note against the dependency it lives in otherwise.
   */
  private judge(
    outcome: BoundaryLevelOutcome,
    context: BoundaryCheckContext,
  ): BoundaryCheckOutcome {
    const judged = new Set(
      context.selectedProjects.map((project) => project.name),
    );

    return {
      failures: outcome.failures.map((failure) => ({
        ...failure,
        verdict: this.resolveVerdict(failure.projects, judged),
      })),
      violations: outcome.violations.map((violation) => ({
        ...violation,
        verdict: this.resolveVerdict(violation.projects, judged),
      })),
    };
  }

  /** `"fail"` when any charged project is judged, and `"note"` otherwise. */
  private resolveVerdict(
    projects: readonly string[],
    judged: ReadonlySet<string>,
  ): BoundaryVerdict {
    return projects.some((project) => judged.has(project)) ? "fail" : "note";
  }

  /**
   * Resolves one level's declared rules out of the nested boundaries shape.
   *
   * A record keyed by level rather than a switch, the same reason `runLevel`
   * is one: every `CodependixBoundaryLevel` must have an entry, so a fifth
   * level added to that union fails to compile here instead of silently
   * resolving to nothing.
   */
  private rulesForLevel(
    boundaries: ResolvedCodependixBoundariesConfiguration,
    level: CodependixBoundaryLevel,
  ): readonly CodependixBoundaryRule[] {
    const rulesByLevel: Record<
      CodependixBoundaryLevel,
      readonly CodependixBoundaryRule[]
    > = {
      nestjsModules: boundaries.nestjsModules,
      nxProjects: boundaries.nxProjects,
      python: boundaries.fileImports.python,
      typescript: boundaries.fileImports.typescript,
    };

    return rulesByLevel[level];
  }

  /**
   * Builds one level's findings, whichever of the four builders it needs.
   *
   * A record keyed by level rather than a switch: the record type requires
   * every `CodependixBoundaryLevel` to have an entry, so a fifth level added
   * to that union fails to compile here instead of silently going unchecked.
   */
  private async runLevel(
    args: LevelCheckArguments,
  ): Promise<BoundaryLevelOutcome> {
    const runners: Record<
      CodependixBoundaryLevel,
      (
        levelArguments: LevelCheckArguments,
      ) => BoundaryLevelOutcome | Promise<BoundaryLevelOutcome>
    > = {
      nestjsModules: async (levelArguments) =>
        this.runNestjsLevel(levelArguments),
      nxProjects: (levelArguments) => this.runNxLevel(levelArguments),
      python: async (levelArguments) =>
        this.runPythonImportsLevel(levelArguments),
      typescript: async (levelArguments) =>
        this.runTypescriptImportsLevel(levelArguments),
    };

    return runners[args.level](args);
  }

  /** Judges every `framework:nestjs` project's module graph. */
  private async runNestjsLevel(
    args: LevelCheckArguments,
  ): Promise<BoundaryLevelOutcome> {
    return this.runProjectLevel({
      buildGraph: async (project) =>
        this.boundaryGraphService.buildNestjsGraph(
          this.moduleGraphService.buildGraph(
            await this.nestjsProjectService.exploreProject(project),
            project.name,
          ),
        ),
      levelArguments: args,
      projects: this.nestjsProjectService.discoverProjects(
        args.context.buildProjects,
      ),
    });
  }

  /**
   * Judges the whole-workspace Nx project graph, drawn over the build set so
   * no edge from a judged project into a dependency is dropped.
   *
   * A graph that cannot be built is charged to every judged project, since
   * none of them could be judged at this level.
   */
  private runNxLevel(args: LevelCheckArguments): BoundaryLevelOutcome {
    const { context, level, rules } = args;

    try {
      const graph = this.boundaryGraphService.buildNxGraph({
        projects: context.buildProjects,
        scope: WORKSPACE_SCOPE,
        workingDirectory: context.workingDirectory,
        workspaceGraph: this.workspaceGraphService.buildWorkspaceGraph(
          context.graph,
          context.buildProjects,
        ),
      });

      return {
        failures: [],
        violations: this.boundariesService.evaluate({ graph, rules }),
      };
    } catch (error) {
      return {
        failures: [
          this.boundaryFailureService.collect({
            error,
            graph: context.graph,
            level,
            projects: context.selectedProjects.map((project) => project.name),
            workspaceProjects: context.projects,
          }),
        ],
        violations: [],
      };
    }
  }

  /**
   * Judges every project in the build set at one level, isolating each
   * project's failure.
   *
   * The three per-project levels differ only in how a project is discovered
   * and how its graph is built, so the loop around them is written once: a
   * project that raises is collected as a failure charged to it, and every
   * other project is still judged. `buildGraph` may be asynchronous because
   * the NestJS level's is — booting a container is the one graph this tool
   * cannot build synchronously.
   */
  private async runProjectLevel<Project extends { name: string }>(args: {
    buildGraph: (project: Project) => BoundaryGraph | Promise<BoundaryGraph>;
    levelArguments: LevelCheckArguments;
    projects: readonly Project[];
  }): Promise<BoundaryLevelOutcome> {
    const { context, level, rules } = args.levelArguments;
    const failures: BoundaryCheckFailure[] = [];
    const violations: BoundaryViolation[] = [];

    for (const project of args.projects) {
      try {
        const graph = await args.buildGraph(project);

        violations.push(...this.boundariesService.evaluate({ graph, rules }));
      } catch (error) {
        failures.push(
          this.boundaryFailureService.collect({
            error,
            graph: context.graph,
            level,
            projects: [project.name],
            workspaceProjects: context.projects,
          }),
        );
      }
    }

    return { failures, violations };
  }

  /** Judges every `language:python` project's file-level import graph. */
  private async runPythonImportsLevel(
    args: LevelCheckArguments,
  ): Promise<BoundaryLevelOutcome> {
    return this.runProjectLevel({
      buildGraph: (project) =>
        this.boundaryGraphService.buildPythonImportGraph(
          this.pythonService.buildGraph(project),
        ),
      levelArguments: args,
      projects: this.pythonService.discoverProjects(args.context.buildProjects),
    });
  }

  /** Judges every TypeScript project's file-level import graph. */
  private async runTypescriptImportsLevel(
    args: LevelCheckArguments,
  ): Promise<BoundaryLevelOutcome> {
    return this.runProjectLevel({
      buildGraph: (project) =>
        this.boundaryGraphService.buildTypescriptImportGraph(
          this.typescriptService.buildGraph(
            this.typescriptService.buildProgram(project),
          ),
        ),
      levelArguments: args,
      projects: this.typescriptService.discoverProjects(
        args.context.buildProjects,
      ),
    });
  }

  // 🌎 Public Methods

  /**
   * Judges every level that has a rule to judge it by and whose graph type
   * this run enabled.
   *
   * The four levels are independent, so a NestJS project failing to boot has
   * no bearing on whether the Nx or import graphs break a rule, and every
   * level is attempted regardless of what an earlier one reported. A level
   * declaring no rule is skipped before anything is built, which is what
   * keeps the gate affordable — and a level whose graph type
   * `context.enabledGraphTypes` excludes is skipped the same way, so
   * `--no-nestjs-modules` never boots a single container to judge it.
   */
  public async run(
    context: BoundaryCheckContext,
  ): Promise<BoundaryCheckOutcome> {
    const { boundaries } = context.configuration;
    const outcomes: BoundaryLevelOutcome[] = [];

    for (const level of BOUNDARY_LEVEL_ORDER) {
      if (!context.enabledGraphTypes.has(this.graphTypeForLevel(level))) {
        continue;
      }

      const rules = this.rulesForLevel(boundaries, level);

      if (rules.length > 0) {
        outcomes.push(await this.runLevel({ context, level, rules }));
      }
    }

    return this.judge(
      {
        failures: outcomes.flatMap((outcome) => outcome.failures),
        violations: outcomes.flatMap((outcome) => outcome.violations),
      },
      context,
    );
  }
}
