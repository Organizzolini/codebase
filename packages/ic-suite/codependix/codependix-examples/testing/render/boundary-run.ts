import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  boundaryCheckService,
  boundaryOutcomeReportService,
  getRunContextService,
} from "./builders";
import { fence } from "./document";
import { buildProjectGraph } from "./nx-graphs";

import type { ExampleWorkspace } from "./nx-graphs";
import type {
  BoundaryCheckOutcome,
  BoundaryReport,
} from "@codependix/boundaries";
import type { CodependixBoundaryRule } from "@codependix/configuration";

// 🏷️ Types

/** One run's outcome, with everything a guide quotes from it. */
export interface BoundaryRun {
  /** The projects every graph was built over, as the run context resolved them. */
  readonly builtProjects: string[];
  /** `1` exactly when a finding is charged to a judged project. */
  readonly exitCode: 0 | 1;
  /** The projects that were judged, which `--projects` resolved to. */
  readonly judged: readonly string[];
  readonly outcome: BoundaryCheckOutcome;
  readonly report: BoundaryReport;
}

/** What one `--check boundaries` run is pointed at. */
export interface BoundaryRunArguments {
  /** `false` for `--no-dependencies`: build the judged projects alone. */
  readonly dependencies?: boolean;
  /** What `--projects` names: project names or globs, as the flag takes them. */
  readonly judged: readonly string[];
  /** The rules the run is judged against, at the one level a run declares. */
  readonly rules: {
    readonly nestjsModules?: CodependixBoundaryRule[];
    readonly nxProjects?: CodependixBoundaryRule[];
  };
  /** Directory the workspace's project roots are resolved against. */
  readonly workingDirectory: string;
  readonly workspace: ExampleWorkspace;
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
 * Everything before the check is the real run: the workspace is written out as
 * the project graph file and configuration a workspace with no Nx would
 * supply, and `RunContextService.build` reads them with `--projects` and
 * `--no-dependencies` exactly as the command does. Which projects are judged,
 * and which are built, are therefore its answers rather than a copy of them.
 */
export async function runBoundaryCheck(
  args: BoundaryRunArguments,
): Promise<BoundaryRun> {
  const directory = mkdtempSync(path.join(tmpdir(), "codependix-boundary-"));

  try {
    const graphPath = path.join(directory, "project-graph.json");
    const configurationPath = path.join(directory, "codependix.config.json");

    writeFileSync(graphPath, JSON.stringify(buildProjectGraph(args.workspace)));
    writeFileSync(
      configurationPath,
      JSON.stringify({
        boundaries: args.rules,
        projectGraph: graphPath,
      }),
    );

    const runContextService = await getRunContextService();
    const context = await runContextService.build({
      mode: "check",
      options: {
        check: "boundaries",
        config: configurationPath,
        ...(args.dependencies !== undefined && {
          dependencies: args.dependencies,
        }),
        projects: args.judged.join(","),
      },
      workingDirectory: args.workingDirectory,
    });
    const judged = context.selectedProjects.map((project) => project.name);
    const outcome = await boundaryCheckService.run(context);

    return {
      builtProjects: context.buildProjects.map((project) => project.name),
      exitCode: failsTheRun(outcome) ? 1 : 0,
      judged,
      outcome,
      report: boundaryOutcomeReportService.buildReport({
        judgedProjects: judged,
        outcome,
      }),
    };
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
}

// 🔏 Helpers

/** Whether any finding is charged to a judged project. */
function failsTheRun(outcome: BoundaryCheckOutcome): boolean {
  return [...outcome.violations, ...outcome.failures].some(
    (finding) => finding.verdict === "fail",
  );
}
