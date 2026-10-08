import {
  boundaryCheckService,
  boundaryOutcomeReportService,
  neighborhoodService,
} from "./builders";
import { fence } from "./document";

import type {
  BoundaryCheckOutcome,
  BoundaryReport,
} from "@codependix/boundaries";
import type { CodependixBoundaryRule } from "@codependix/configuration";
import type { NxProject, NxProjectGraph } from "@codependix/nx-projects";

// 🏷️ Types

/** One run's outcome, with everything a guide quotes from it. */
export interface BoundaryRun {
  /** The projects every graph was built over, sorted. */
  readonly builtProjects: string[];
  /** `1` exactly when a finding is charged to a judged project. */
  readonly exitCode: 0 | 1;
  readonly judged: readonly string[];
  readonly outcome: BoundaryCheckOutcome;
  readonly report: BoundaryReport;
}

/** What one `--check boundaries` run is pointed at. */
export interface BoundaryRunArguments {
  /** `false` for `--no-dependencies`: build the judged projects alone. */
  readonly dependencies?: boolean;
  readonly graph: NxProjectGraph;
  /** The projects `--projects` named, which are the only ones that can fail. */
  readonly judged: readonly string[];
  readonly projects: NxProject[];
  /** The rules the run is judged against, at the one level a run declares. */
  readonly rules: {
    readonly nestjsModules?: CodependixBoundaryRule[];
    readonly nxProjects?: CodependixBoundaryRule[];
  };
  readonly workingDirectory: string;
}

// 🏃 Running

/**
 * Renders a run the way a reader would see it: what was judged, what was
 * built, the exit code, and each project's findings.
 */
export function renderBoundaryRun(run: BoundaryRun): string {
  return fence(
    [
      `judged:  ${run.judged.join(", ")}`,
      `built:   ${run.builtProjects.join(", ")}`,
      `exit:    ${run.exitCode}`,
      "",
      boundaryOutcomeReportService.renderMarkdown(run.report),
    ].join("\n"),
  );
}

/**
 * Runs the real boundary check over an example workspace and judges it.
 *
 * Resolves the build set the way `RunContextService` does, from the same
 * dependency closure, so what a guide shows is what `--projects` builds.
 */
export async function runBoundaryCheck(
  args: BoundaryRunArguments,
): Promise<BoundaryRun> {
  const selectedProjects = args.projects.filter((project) =>
    args.judged.includes(project.name),
  );
  const buildProjects = resolveBuildProjects({ ...args, selectedProjects });
  const outcome = await boundaryCheckService.run({
    buildProjects,
    configuration: {
      boundaries: {
        fileImports: { python: [], typescript: [] },
        nestjsModules: args.rules.nestjsModules ?? [],
        nxProjects: args.rules.nxProjects ?? [],
      },
      exclude: [],
      include: ["**"],
      projectGraph: undefined,
      selection: {
        dependencies: args.dependencies ?? true,
        projects: [...args.judged],
        tags: [],
      },
      workspace: {},
    },
    enabledGraphTypes: new Set(["fileImports", "nestjsModules", "nxProjects"]),
    graph: args.graph,
    projects: args.projects,
    selectedProjects,
    workingDirectory: args.workingDirectory,
  });

  return {
    builtProjects: buildProjects.map((project) => project.name),
    exitCode: failsTheRun(outcome) ? 1 : 0,
    judged: args.judged,
    outcome,
    report: boundaryOutcomeReportService.buildReport({
      judgedProjects: args.judged,
      outcome,
    }),
  };
}

// 🔏 Helpers

/** Whether any finding is charged to a judged project. */
function failsTheRun(outcome: BoundaryCheckOutcome): boolean {
  return [...outcome.violations, ...outcome.failures].some(
    (finding) => finding.verdict === "fail",
  );
}

/** The judged projects and their dependency closure, or the judged alone. */
function resolveBuildProjects(
  args: BoundaryRunArguments & {
    selectedProjects: NxProject[];
  },
): NxProject[] {
  if (args.dependencies === false) return args.selectedProjects;

  const closure = new Set(
    neighborhoodService.resolveDependencyClosure(
      args.graph,
      args.selectedProjects.map((project) => project.name),
    ),
  );

  return args.projects.filter((project) => closure.has(project.name));
}
