import path from "node:path";

import {
  BoundaryCheckService,
  RunContextService,
} from "@codependix/boundaries";
import { CHECK_NAMES, ConfigurationService } from "@codependix/configuration";
import {
  CombinedOutputService,
  FORMAT_MARKDOWN,
  FORMAT_NAMES,
  GraphRunService,
  ReportingService,
} from "@codependix/output";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logging";

import type { GraphRunContext } from "@codependix/boundaries";
import type { MapCommandOptions } from "@codependix/configuration";
import type { RunMode } from "@codependix/core";
import type {
  CombinedGraphExports,
  CombinedOutputFormat,
  MapRunResult,
} from "@codependix/output";

/**
 * CLI entry point for the codependix dependency graph workflow.
 *
 * `--write` publishes every configured export; `--check` names which finding
 * fails the run — `boundaries` for an edge breaking a declared rule, `reports`
 * for a configured destination that has gone stale. No per-graph-type
 * subcommand: which graphs run, where each project's export lands, and which
 * rules judge them is entirely a function of `codependix.config.ts`, read by
 * `@codependix/configuration`.
 *
 * The two findings are named apart because they belong on opposite sides of a
 * pull request. An export moves with the workspace it describes, so gating
 * staleness on a branch fails every branch that touched a project graph; a
 * broken boundary is caused by the branch and fixed by it. This is the split
 * `callidescope` already made between `--check depth` and `--check reports`,
 * copied wholesale down to the spelling of `reports`.
 */
@Command({
  description: "Map every configured dependency graph and export it",
  name: "map",
})
@Injectable()
export class MapCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly graphRunService: GraphRunService,
    private readonly boundaryCheckService: BoundaryCheckService,
    private readonly combinedOutputService: CombinedOutputService,
    private readonly configurationService: ConfigurationService,
    private readonly logger: LoggerService,
    private readonly reportingService: ReportingService,
    private readonly runContextService: RunContextService,
  ) {
    super();
    this.logger.setContext(MapCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Prints and writes every active graph type's combined output, when the
   * export pass ran at all.
   *
   * A `--check boundaries`-only run never reaches this: nothing was built to
   * combine, so `--format`/`--json-output`/`--markdown-output` are silently
   * inert on a run that touched no export at all — the same way `--write`
   * and `--check reports` are inert on one that never named a destination.
   */
  private runCombinedOutput(args: {
    combinedGraphs: CombinedGraphExports | undefined;
    format: CombinedOutputFormat;
    options: MapCommandOptions;
    workingDirectory: string;
  }): void {
    if (args.combinedGraphs === undefined) return;

    this.combinedOutputService.run({
      format: args.format,
      graphs: args.combinedGraphs,
      jsonOutputPath: args.options.jsonOutput,
      markdownOutputPath: args.options.markdownOutput,
      workingDirectory: args.workingDirectory,
    });
  }

  /**
   * Runs the export pass, warning when nothing was selected.
   *
   * Returns both the usual delivery outcome and every active graph type's
   * whole-workspace data, so `runMode` can hand the latter to
   * `CombinedOutputService` without running the export pass a second time.
   */
  private async runExports(context: GraphRunContext): Promise<MapRunResult> {
    const result = await this.graphRunService.run(context);

    this.reportingService.reportEmptySelection(
      result.outcome.results.length + result.outcome.failures.length,
    );

    return result;
  }

  /**
   * Runs the passes a resolved mode selected, and reports what they found.
   *
   * Split from `run` so the command line's own rejection path stays a
   * handful of lines: everything below here has a mode to act on. Both
   * passes are run directly here, rather than through a further-nested
   * helper, to keep `MapCommand.run`'s own call stack inside this project's
   * callidescope depth limit — see `packages/codependix-cli/callidescope.config.ts`.
   */
  private async runMode(args: {
    format: CombinedOutputFormat;
    mode: RunMode;
    options: MapCommandOptions;
  }): Promise<void> {
    const { format, mode, options } = args;
    const context = await this.runContextService.build({
      mode: mode.writes ? "write" : "check",
      options,
      workingDirectory: path.resolve(options.directory ?? process.cwd()),
    });
    const exportRun = this.configurationService.touchesFiles(mode)
      ? await this.runExports(context)
      : undefined;
    const boundaryOutcome = mode.checksBoundaries
      ? await this.boundaryCheckService.run(context)
      : undefined;

    this.runCombinedOutput({
      combinedGraphs: exportRun?.combinedGraphs,
      format,
      options,
      workingDirectory: context.workingDirectory,
    });

    if (
      !this.reportingService.reportPassOutcomes({ boundaryOutcome, exportRun })
    ) {
      process.exitCode = 1;
      return;
    }

    this.reportingService.reportSuccess({
      boundaryOutcome,
      exportOutcome: exportRun?.outcome,
    });
  }

  // 🌎 Public Methods

  /**
   * Parses the set of findings the run fails on.
   *
   * The parser runs only when `--check` carries a value, so anything reaching
   * it is a written set. A `--check` with no value never arrives here and is
   * refused later: a set with nothing in it is indistinguishable from the flag
   * having been left off, which is how one flag came to gate two findings.
   */
  @Option({
    description: `Fail on a comma-separated set drawn from ${CHECK_NAMES.map((name) => `"${name}"`).join(" and ")}`,
    flags: "--check [check]",
  })
  public parseCheck(value: string): string {
    return value;
  }

  /** Parses the optional configuration path from command-line input. */
  @Option({
    description: "Path to the codependix configuration file",
    flags: "--config [config]",
  })
  public parseConfig(value: string | undefined): string | undefined {
    return this.configurationService.parseOptionalOption(value);
  }

  /** Parses the directory whose Nx workspace this run reads. */
  @Option({
    description: "Directory whose Nx workspace this run reads",
    flags: "-d, --directory [directory]",
  })
  public parseDirectory(value: string | undefined): string {
    return this.configurationService.parsePathOption(value);
  }

  /**
   * Parses `--exclude`, a comma-separated list of globs overriding the
   * configured `exclude`.
   *
   * Refused later, by `ConfigurationService.loadConfiguration`, when the
   * configuration this run reads never declared `exclude` in the first
   * place — matching callidescope's `--exclude` refusal exactly.
   */
  @Option({
    description:
      "Comma-separated globs overriding the configured exclude. Refused when exclude was never configured",
    flags: "--exclude [exclude]",
  })
  public parseExclude(value: string | undefined): string[] {
    return this.configurationService.parseCommaDelimitedOption(value);
  }

  /** Enables the `fileImports` graph type for this run. */
  @Option({
    description: "Build, check, and write the fileImports graph type",
    flags: "--file-imports",
  })
  public parseFileImports(): true {
    return true;
  }

  /**
   * Parses what `--format` prints to standard output.
   *
   * Defaults to Markdown when the flag was left off entirely — see
   * `MapCommand.resolveFormat`, which validates the value this returns.
   */
  @Option({
    description: `What to print to standard output, one of ${FORMAT_NAMES.join(" and ")} (default: ${FORMAT_MARKDOWN}). A graph type prints only when this run also configured a workspace destination for it, even if its own toggle flag enabled it`,
    flags: "-f, --format [format]",
  })
  public parseFormat(value: string | undefined): string | undefined {
    return this.configurationService.parseOptionalOption(value);
  }

  /**
   * Parses `--include`, a comma-separated list of globs overriding the
   * configured `include`.
   *
   * Refused later, alongside `--exclude`, when the configuration this run
   * reads never declared `include`.
   */
  @Option({
    description:
      "Comma-separated globs overriding the configured include. Refused when include was never configured",
    flags: "--include [include]",
  })
  public parseInclude(value: string | undefined): string[] {
    return this.configurationService.parseCommaDelimitedOption(value);
  }

  /**
   * Parses `--json-output`, the path to write every active graph type's
   * combined JSON data to, keyed by graph type name.
   */
  @Option({
    description:
      "Write every active graph type's data, combined into one JSON file at this path, keyed by graph type name. A type appears only when this run also configured a workspace destination for it",
    flags: "--json-output [jsonOutput]",
  })
  public parseJsonOutput(value: string | undefined): string | undefined {
    return this.configurationService.parseOptionalOption(value);
  }

  /**
   * Parses `--markdown-output`, the path to write every active graph type's
   * combined, anchor-spliced Markdown diagram to.
   */
  @Option({
    description:
      "Write every active graph type's rendered diagram, combined into one Markdown file at this path. A type appears only when this run also configured a workspace destination for it",
    flags: "--markdown-output [markdownOutput]",
  })
  public parseMarkdownOutput(value: string | undefined): string | undefined {
    return this.configurationService.parseOptionalOption(value);
  }

  /** Enables the `nestjsModules` graph type for this run. */
  @Option({
    description: "Build, check, and write the nestjsModules graph type",
    flags: "--nestjs-modules",
  })
  public parseNestjsModules(): true {
    return true;
  }

  /** Disables the `fileImports` graph type for this run. */
  @Option({
    description: "Skip the fileImports graph type for this run",
    flags: "--no-file-imports",
  })
  public parseNoFileImports(): false {
    return false;
  }

  /** Disables the `nestjsModules` graph type for this run. */
  @Option({
    description: "Skip the nestjsModules graph type for this run",
    flags: "--no-nestjs-modules",
  })
  public parseNoNestjsModules(): false {
    return false;
  }

  /** Disables the `nxProjects` graph type for this run. */
  @Option({
    description: "Skip the nxProjects graph type for this run",
    flags: "--no-nx-projects",
  })
  public parseNoNxProjects(): false {
    return false;
  }

  /** Enables the `nxProjects` graph type for this run. */
  @Option({
    description: "Build, check, and write the nxProjects graph type",
    flags: "--nx-projects",
  })
  public parseNxProjects(): true {
    return true;
  }

  /**
   * Parses the projects a run exports for beyond `include`.
   *
   * **Widening, and narrowing.** A named project is added to whatever
   * `include` already selected, and `exclude` still wins over it. It also
   * narrows what a run draws and judges: the Workspace Graph's node set and
   * every level `--check boundaries` judges become the named set. A narrowed
   * gate sees fewer edges than a whole-workspace one — fine for a local run,
   * and worth thinking twice about in CI.
   */
  @Option({
    description:
      "Comma-separated project names or roots to export for, as globs, beyond those include already selects. Also narrows the Workspace Graph and --check boundaries to the named set",
    flags: "--projects [projects]",
  })
  public parseProjects(value: string | undefined): string | undefined {
    return this.configurationService.parseOptionalOption(value);
  }

  /**
   * Parses the Nx tags a run exports for, matched exactly against a project's
   * own tags. Widens and narrows exactly as `--projects` does.
   */
  @Option({
    description:
      "Comma-separated Nx tags to export for, beyond what include already selects. Also narrows the Workspace Graph and --check boundaries to the tagged projects",
    flags: "--tags [tags]",
  })
  public parseTags(value: string | undefined): string | undefined {
    return this.configurationService.parseOptionalOption(value);
  }

  /** Parses the `--write` flag from command-line input. */
  @Option({
    description: "Write every configured export",
    flags: "--write",
  })
  public parseWrite(value: boolean | undefined): boolean {
    return this.configurationService.parseFlagOption(value);
  }

  /**
   * Runs whatever the command line asked for: exports, boundaries, or both.
   *
   * Every project is attempted regardless of whether an earlier one failed —
   * both passes isolate a project's failure to itself — so this only decides
   * the exit code from what came back. The two passes are also weighed
   * independently rather than the first failure short-circuiting the second:
   * a run gating both should report both, not the one that happened to run
   * first.
   */
  async run(
    _passedParameters: string[],
    options: MapCommandOptions = {},
  ): Promise<void> {
    try {
      const { errors, mode } =
        await this.configurationService.selectMode(options);
      const { errors: formatErrors, format } =
        this.combinedOutputService.resolveFormat(options.format);
      const rejections = [...errors, ...formatErrors];

      if (rejections.length > 0) {
        this.logger.error("🕸️ Rejected the command line", undefined, {
          reasons: rejections,
        });
        process.exitCode = 1;
        return;
      }

      await this.runMode({ format, mode, options });
    } catch (error) {
      this.reportingService.reportFailure(error);
    }
  }
}
