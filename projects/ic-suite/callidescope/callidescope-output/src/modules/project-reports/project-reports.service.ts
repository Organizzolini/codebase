import { PathsService, SignaturesService } from "@callidescope/graph";
import { Injectable } from "@nestjs/common";

import { MINIMUM_STACK_FRAMES } from "./project-reports.constants";

import type {
  BuildProjectReportsArguments,
  FindOwnedFindingsArguments,
  OwnedFindings,
} from "./project-reports.types";
import type {
  ProjectLimits,
  ProjectLimitsLookup,
} from "@callidescope/configuration";
import type {
  CallableBreadthReport,
  CallGraphSummary,
  CallStack,
  DeepStackFinding,
  ProjectReport,
  WideCallableFinding,
} from "@callidescope/core";

/**
 * Scopes a run's findings to the project each one came from.
 *
 * A section embedded in a project's README should describe that project, not
 * the workspace it happens to sit in, so everything here is keyed on the
 * project the entry point — or the reported callable — belongs to.
 */
@Injectable()
export class ProjectReportsService {
  // 🏗 Dependency Injection

  constructor(
    private readonly pathsService: PathsService,
    private readonly signaturesService: SignaturesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Builds every callable's breadth, grouped by project. */
  private buildCallableBreadths(
    args: BuildProjectReportsArguments,
  ): Map<string, CallableBreadthReport[]> {
    const byProject = new Map<string, CallableBreadthReport[]>();

    for (const [callableId, callable] of args.callablesById) {
      const measured = args.breadthMeasurement.byCallable.get(callableId);

      if (measured === undefined || measured.breadth === 0) {
        continue;
      }

      const callees = measured.calleeIds.flatMap((calleeId) => {
        const callee = args.callablesById.get(calleeId);

        return callee === undefined
          ? []
          : [{ displayName: callee.node.displayName, id: calleeId }];
      });

      const reports = byProject.get(callable.node.projectName) ?? [];

      reports.push({
        breadth: measured.breadth,
        callees,
        displayName: callable.node.displayName,
        id: callableId,
        location: callable.node.location,
        signature: this.signaturesService.read({
          checker: callable.projectProgram.checker,
          declaration: callable.declaration,
        }),
      });
      byProject.set(callable.node.projectName, reports);
    }

    return byProject;
  }

  /** Builds every stack that makes at least one call, deepest first. */
  private buildStacks(
    args: BuildProjectReportsArguments,
  ): Map<string, CallStack[]> {
    const byProject = new Map<string, CallStack[]>();

    for (const entryPoint of args.entryPoints.entryPoints) {
      const callable = args.callablesById.get(entryPoint.callableId);
      const measured =
        callable === undefined
          ? undefined
          : this.readDepth({
              callableId: entryPoint.callableId,
              condensed: args.condensed,
              measurement: args.measurement,
            });

      if (callable === undefined || measured === undefined) {
        continue;
      }

      const frames = this.pathsService.buildDeepestPath({
        callablesById: args.callablesById,
        condensed: args.condensed,
        entryPointId: entryPoint.callableId,
        measurement: args.measurement,
      });

      if (frames.length < MINIMUM_STACK_FRAMES) {
        continue;
      }

      const stacks = byProject.get(callable.node.projectName) ?? [];

      stacks.push({
        depth: measured.depth,
        entryPointKind: entryPoint.kind,
        frames,
        isLowerBound: measured.reachesUnresolved,
      });
      byProject.set(callable.node.projectName, stacks);
    }

    return byProject;
  }

  /** Counts what one project contributed to the graph. */
  private buildSummary(args: {
    callablesById: BuildProjectReportsArguments["callablesById"];
    fileCount: number;
    graph: BuildProjectReportsArguments["graph"];
    projectName: string;
    stacks: readonly CallStack[];
  }): CallGraphSummary {
    const owned = new Set<string>();

    for (const [callableId, callable] of args.callablesById) {
      if (callable.node.projectName === args.projectName) {
        owned.add(callableId);
      }
    }

    return {
      callableCount: owned.size,
      cyclicComponentCount: args.stacks.filter((stack) =>
        stack.frames.some((frame) => frame.isCycle),
      ).length,
      edgeCount: args.graph.edges.filter((edge) => owned.has(edge.callerId))
        .length,
      entryPointCount: args.stacks.length,
      fileCount: args.fileCount,
      maximumDepth: args.stacks.reduce(
        (deepest, stack) => Math.max(deepest, stack.depth),
        0,
      ),
      projectCount: 1,
      unresolvedCallCount: args.graph.unresolvedCalls.filter((call) =>
        owned.has(call.callerId),
      ).length,
    };
  }

  /** Picks the stacks one project's own depth limit fails on. */
  private findProjectDeepStacks(args: {
    limit: number;
    report: ProjectReport;
  }): DeepStackFinding[] {
    return args.report.stacks
      .filter((stack) => stack.depth > args.limit)
      .map((stack) => ({ ...stack, limit: args.limit }));
  }

  /** Picks the callables one project's own breadth limit fails on. */
  private findProjectWideCallables(args: {
    limit: number;
    report: ProjectReport;
  }): WideCallableFinding[] {
    return args.report.callableBreadths
      .filter((breadth) => breadth.breadth > args.limit)
      .map((breadth) => ({ ...breadth, limit: args.limit }));
  }

  /** Reads the depth measured for one callable, or nothing if unmeasured. */
  private readDepth(args: {
    callableId: string;
    condensed: BuildProjectReportsArguments["condensed"];
    measurement: BuildProjectReportsArguments["measurement"];
  }): undefined | { depth: number; reachesUnresolved: boolean } {
    const componentId = args.condensed.componentIdByCallable.get(
      args.callableId,
    );

    if (componentId === undefined) {
      return undefined;
    }

    const measured = args.measurement.byComponent[componentId];

    return measured === undefined
      ? undefined
      : {
          depth: measured.depth,
          reachesUnresolved: measured.reachesUnresolved,
        };
  }

  /**
   * Reads the limits one project is judged against.
   *
   * A project the lookup does not name falls back to the workspace's, which is
   * what a project declaring nothing is given anyway — so a report arriving
   * from outside the resolved set is judged rather than silently exempted.
   */
  private readProjectLimits(args: {
    limits: ProjectLimitsLookup;
    projectName: string;
  }): ProjectLimits {
    return args.limits.byProject.get(args.projectName) ?? args.limits.workspace;
  }

  // 🌎 Public Methods

  /** Builds one report per project, in the order the projects were traced. */
  public build(args: BuildProjectReportsArguments): ProjectReport[] {
    const stacksByProject = this.buildStacks(args);
    const callableBreadthsByProject = this.buildCallableBreadths(args);

    return args.projectNames.map((projectName) => {
      const stacks = (stacksByProject.get(projectName) ?? []).toSorted(
        (first, second) => second.depth - first.depth,
      );

      return {
        callableBreadths: (
          callableBreadthsByProject.get(projectName) ?? []
        ).toSorted((first, second) => second.breadth - first.breadth),
        projectName,
        stacks,
        summary: this.buildSummary({
          callablesById: args.callablesById,
          fileCount: args.fileCountByProject.get(projectName) ?? 0,
          graph: args.graph,
          projectName,
          stacks,
        }),
      };
    });
  }

  /**
   * Picks the stacks a run should fail on, deepest first.
   *
   * A filter over the stacks the reports already hold rather than a second
   * traversal: reconstructing the same paths twice would let the number the
   * gate fails on drift from the number the README publishes.
   *
   * Each project is judged against its own limit rather than one number for
   * the whole workspace, so a stack deeper than the project that roots it
   * allows is reported even when a noisier project elsewhere allows more.
   * The stack is judged by the project owning its entry point, which is the
   * project `build` already filed it under.
   *
   * `maximumDepth` is a positive integer, so a stack past it is at least two
   * deep and therefore survived the minimum-frame filter above.
   */
  public findDeepStacks(args: {
    limits: ProjectLimitsLookup;
    reports: readonly ProjectReport[];
  }): DeepStackFinding[] {
    return args.reports
      .flatMap((report) =>
        this.findProjectDeepStacks({
          limit: this.readProjectLimits({
            limits: args.limits,
            projectName: report.projectName,
          }).maximumDepth,
          report,
        }),
      )
      .toSorted((first, second) => second.depth - first.depth);
  }

  /**
   * Picks the findings a named set of projects owns, and nothing else.
   *
   * For a run whose verdict covers fewer projects than its measurement did. A
   * finding's owner is already decided — `build` files a stack under the
   * project owning its entry point and a breadth report under the project
   * declaring the callable — so this selects among those reports rather than
   * deciding ownership a second way.
   *
   * A named project the reports do not hold contributes nothing rather than
   * being an error: a run may be pointed at a project whose files it then
   * found nothing in, and having read nothing is a fact for the caller's own
   * rules to judge.
   */
  public findOwnedFindings(args: FindOwnedFindingsArguments): OwnedFindings {
    const reports = args.reports.filter((report) =>
      args.projectNames.includes(report.projectName),
    );

    return {
      deepStacks: this.findDeepStacks({ limits: args.limits, reports }),
      wideCallables: this.findWideCallables({ limits: args.limits, reports }),
    };
  }

  /**
   * Picks the named projects a run opened no file of its own from.
   *
   * The companion to `findOwnedFindings`, and the reason it needs one: owning
   * no finding is what a clean project and an unread one look like from the
   * outside, and a caller judging only the findings cannot tell them apart.
   * The project's own `fileCount` is what separates them — `collect` counts a
   * file per project once the run's exclusions and the per-project ones have
   * had their say, so a project whose files were all filtered away reports
   * zero however much the rest of the run read.
   *
   * **Files rather than callables**, which is the weaker of the two questions
   * and the right one. A project can hold files that declare no callable at
   * all — one whose `tsconfig.json` names only its own configuration files and
   * its tests is the shape, and this repository has five — and those were
   * read, so a verdict on them is a verdict on something. Asking for a
   * callable would fail every one of them for containing no functions, which
   * is not a finding about anything. The cost is stated plainly: a project
   * whose sources are excluded while a configuration file of its own survives
   * counts as read.
   *
   * A named project with no report at all counts as unread rather than as an
   * error, the same way `findOwnedFindings` treats one: a run pointed at a
   * project the workspace configuration excludes never discovers it, and that
   * is exactly the case worth failing.
   */
  public findUnreadProjects(args: {
    /** The projects entitled to fail on what they own. */
    projectNames: readonly string[];
    reports: readonly ProjectReport[];
  }): string[] {
    return args.projectNames.filter(
      (projectName) =>
        (args.reports.find((report) => report.projectName === projectName)
          ?.summary.fileCount ?? 0) === 0,
    );
  }

  /**
   * Picks the callables a run should fail on, widest first.
   *
   * A filter over the breadth reports the reports already hold, mirroring
   * `findDeepStacks`, so the number the gate fails on cannot drift from the
   * number the README publishes. A callable is judged by the project that
   * declares it, which is the project `build` already filed it under.
   *
   * No default exists for `maximumBreadth`: until a configuration sets one,
   * nothing can exceed it, so a project with no limit anywhere in its
   * inheritance reports nothing rather than being judged against a number
   * nobody chose.
   */
  public findWideCallables(args: {
    limits: ProjectLimitsLookup;
    reports: readonly ProjectReport[];
  }): WideCallableFinding[] {
    return args.reports
      .flatMap((report) =>
        this.findProjectWideCallables({
          limit:
            this.readProjectLimits({
              limits: args.limits,
              projectName: report.projectName,
            }).maximumBreadth ?? Infinity,
          report,
        }),
      )
      .toSorted((first, second) => second.breadth - first.breadth);
  }
}
