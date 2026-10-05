import path from "node:path";

import { ConfigurationService, FORMAT_NAMES } from "@codometer/configuration";
import { MeasureService } from "@codometer/measurement";
import {
  DeliveryService,
  DestinationsService,
  ReportService,
} from "@codometer/output";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logging";

import type { ReportFindingsArguments, RunPlan } from "./measure.types";
import type {
  MeasureCommandOptions,
  ResolvedCodometerConfiguration,
} from "@codometer/configuration";
import type { MeasurementResult } from "@codometer/measurement";

/**
 * CLI entry point for the repository measurement workflow.
 */
@Command({
  description: "Measure a directory and produce every resolved output",
  name: "measure",
})
@Injectable()
export class MeasureCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly measureService: MeasureService,
    private readonly deliveryService: DeliveryService,
    private readonly reportService: ReportService,
    private readonly destinationsService: DestinationsService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(MeasureCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Say which files were left out because codometer writes them.
   *
   * Announced rather than left to be noticed. A file missing from the counts
   * with no explanation reads as a measurement bug, and the last repository to
   * hit this wrote the exclusion into its ignore file by hand.
   */
  private announceOutputPaths(outputPaths: string[]): void {
    if (outputPaths.length === 0) {
      return;
    }

    this.logger.info(
      `📊 Excluded the files codometer writes from what it measures`,
      undefined,
      { paths: outputPaths },
    );
  }

  /**
   * Replaces every configured input with the globs `--inputs` named, when it
   * was passed.
   *
   * Not a filter over configured inputs: the run measures exactly the globs
   * given, running the `language` analysis over them, with no other input —
   * not even the built-in `codebase` one — active.
   */
  private applyInputsOverride(
    configuration: ResolvedCodometerConfiguration,
    globs: string[] | undefined,
  ): ResolvedCodometerConfiguration {
    if (globs === undefined) {
      return configuration;
    }

    return {
      ...configuration,
      inputs: [
        {
          analyses: ["language"],
          compression: "none",
          directory: ".",
          exclude: [],
          include: globs,
          name: "Command Line",
        },
      ],
    };
  }

  /**
   * Read the configuration, or say why it could not be read.
   *
   * A configuration nothing can parse fails the run rather than being taken as
   * an empty one, and so does a directory with no configuration file anywhere
   * above it: `format` is required with no code-level fallback, so an absent
   * file fails on the missing `format` exactly as a file that forgot to write
   * one does. A shared default object, spread by each project's own
   * `codometer.config.ts`, is what states it once for a workspace.
   */
  private async readConfiguration(
    options: MeasureCommandOptions,
    workingDirectory: string,
  ): Promise<ResolvedCodometerConfiguration | undefined> {
    try {
      const configuration = await this.configurationService.loadConfiguration({
        configurationPath: options.config,
        searchDirectory: workingDirectory,
      });

      this.logger.debug("🗂️ Loaded the configuration", undefined, {
        configuredPath: options.config,
      });

      return configuration;
    } catch (error: unknown) {
      this.logger.error(`📊 Rejected the configuration`, undefined, {
        reason: error instanceof Error ? error.message : String(error),
      });
      process.exitCode = 1;
      return undefined;
    }
  }

  /** Says the command line could not be made sense of, and fails the run. */
  private rejectCommandLine(reasons: string[]): void {
    this.logger.error(`📊 Rejected the command line`, undefined, { reasons });
    process.exitCode = 1;
  }

  /** Report every breached limit, and say whether one of them fails the run. */
  private reportBreaches(args: ReportFindingsArguments): boolean {
    const breached = args.measurement.limits.filter((limit) => limit.breached);
    const failing = breached.filter((limit) => limit.severity === "fail");
    const warning = breached.filter((limit) => limit.severity === "warn");

    if (warning.length > 0) {
      this.logger.warn(`📊 Breached a warning limit`, undefined, {
        limits: warning,
      });
    }

    if (failing.length > 0) {
      this.logger.error(`📊 Breached a failing limit`, undefined, {
        limits: failing,
      });
    }

    return args.mode.checksLimits && failing.length > 0;
  }

  /**
   * Report whatever the run could not do, and say whether it fails the run.
   *
   * A failure is neither staleness nor a breach: it is the run not having
   * finished. It stops any run that produces or gates an output, because a
   * report built from a partial measurement is not one to publish and a gate
   * that could not be evaluated has not been passed. A run that does neither
   * says so and exits clean, exactly as its flags promised.
   */
  private reportFailures(args: ReportFindingsArguments): boolean {
    if (args.measurement.failures.length === 0) {
      return false;
    }

    this.logger.error(`📊 Failed to measure part of the run`, undefined, {
      failures: args.measurement.failures,
    });

    return (
      args.mode.checksLimits ||
      args.mode.checksReports ||
      args.mode.writesJson ||
      args.mode.writesMarkdown
    );
  }

  /** Weigh every finding, set the exit code once, and say the run is done. */
  private reportFindings(args: ReportFindingsArguments): void {
    const failed = this.reportFailures(args);
    const stale = this.reportStaleness(args);
    const breached = this.reportBreaches(args);

    if (failed || stale || breached) {
      process.exitCode = 1;
    }

    this.logger.info("✅ Finished the measurement run", undefined, {
      breachCount: args.measurement.limits.filter((limit) => limit.breached)
        .length,
      inputCount: args.measurement.inputs.length,
    });
  }

  /** Report every stale destination, and say whether that fails the run. */
  private reportStaleness(args: ReportFindingsArguments): boolean {
    if (args.stalePaths.length === 0) {
      return false;
    }

    this.logger.error(`📊 Found stale reports`, undefined, {
      paths: args.stalePaths,
    });

    return true;
  }

  /**
   * Reads the flags into everything the rest of the run needs: the mode, the
   * resolved configuration, what to print, and where each output goes.
   *
   * `undefined` when the run cannot proceed at all — a rejected command line,
   * or a configuration that failed to load — with the refusal and exit code
   * already reported, so nothing after this has to check twice.
   */
  private async resolveRunPlan(
    options: MeasureCommandOptions,
    workingDirectory: string,
  ): Promise<RunPlan | undefined> {
    const { errors: modeErrors, mode } =
      this.configurationService.selectMode(options);

    if (modeErrors.length > 0) {
      this.rejectCommandLine(modeErrors);
      return undefined;
    }

    const loadedConfiguration = await this.readConfiguration(
      options,
      workingDirectory,
    );

    if (loadedConfiguration === undefined) {
      return undefined;
    }

    const configuration = this.applyInputsOverride(
      loadedConfiguration,
      options.inputs,
    );
    const formatErrors: string[] = [];
    const format = this.configurationService.resolveFormat(
      options.format,
      configuration.format,
      formatErrors,
    );
    const { destinations, errors: destinationErrors } =
      this.destinationsService.resolveDestinations({
        configuration,
        options,
        workingDirectory,
      });

    if (formatErrors.length > 0 || destinationErrors.length > 0) {
      this.rejectCommandLine([...formatErrors, ...destinationErrors]);
      return undefined;
    }

    const consoleMarkdown = this.destinationsService.resolveConsoleMarkdown({
      configuration,
      options,
      workingDirectory,
    });

    return { configuration, consoleMarkdown, destinations, format, mode };
  }

  /**
   * Resolve the directory the run measures, and announce that it started.
   *
   * Always the process's working directory: unlike every other flag, there is
   * no per-run override for it — a run measures where it was invoked.
   */
  private resolveWorkingDirectory(): string {
    const workingDirectory = path.resolve(process.cwd());

    this.logger.debug("🚀 Started the measurement run", undefined, {
      directory: workingDirectory,
    });

    return workingDirectory;
  }

  // 🌎 Public Methods

  /**
   * Parse the set of things the run fails on from command-line input.
   *
   * The parser runs only when `--check` carries a value, so anything reaching
   * it is a written set. A `--check` with no value never arrives here at all
   * and is refused later, because a set with nothing in it is indistinguishable
   * from the flag having been left off — which is how check mode once silently
   * became write mode.
   */
  @Option({
    description: `Fail on a comma-separated set drawn from "reports" and "limits"`,
    flags: "--check [check]",
  })
  public parseCheck(value: string): string {
    return value;
  }

  /**
   * Parse the optional configuration path from command-line input.
   */
  @Option({
    description: "Path to the codometer configuration file",
    flags: "--config [config]",
  })
  public parseConfig(value: string | undefined): string | undefined {
    return value;
  }

  /**
   * Parse what the run prints from command-line input.
   *
   * Says nothing about which files are written — that is each `--output-*`
   * flag's job. Omitted, it reads the resolved configuration's own required
   * `format` field rather than inferring one from which other flags are
   * present.
   */
  @Option({
    description: `What to print to standard output, one of ${FORMAT_NAMES.join(" and ")}`,
    flags: "-f, --format <format>",
  })
  public parseFormat(value: string): string {
    return value;
  }

  /**
   * Parse the glob array that replaces every configured input, from
   * command-line input.
   *
   * Each value commander hands the parser is one glob; they accumulate into
   * one array across the whole `--inputs` invocation.
   */
  @Option({
    description:
      "Glob array measured in place of every configured input, with no configured input — not even the built-in codebase one — active",
    flags: "--inputs [globs...]",
  })
  public parseInputs(value: string, previous: string[] = []): string[] {
    return [...previous, value];
  }

  /**
   * Parse the report's destination from command-line input.
   *
   * `true` when the flag was passed with no value, asking this run to write
   * wherever the resolved configuration's own JSON output says to; a string
   * when a path was given, which is used for this destination alone.
   */
  @Option({
    description:
      "Write the JSON report, at the given path or the configured one",
    flags: "--output-json [outputJson]",
  })
  public parseOutputJson(value: string | true): string | true {
    return value;
  }

  /**
   * Parse the markdown badge block's destination from command-line input.
   *
   * `true` when the flag was passed with no value, asking this run to write
   * wherever the resolved configuration's own markdown output says to; a
   * string when a path was given, which is used for this destination alone.
   */
  @Option({
    description:
      "Write the markdown badge block, at the given path or the configured one",
    flags: "--output-markdown [outputMarkdown]",
  })
  public parseOutputMarkdown(value: string | true): string | true {
    return value;
  }

  /**
   * Measure the repository and produce every resolved output.
   *
   * Flags are independent: `--output-json`/`--output-markdown` each write
   * their own destination, `--check reports` fails on a stale report,
   * `--check limits` fails on a breached limit, `--format` prints, and none of
   * them turns another on. Every output is produced before any finding is
   * weighed, so a run that writes and gates leaves the report behind even
   * when the gate trips.
   */
  async run(
    _passedParameters: string[],
    options: MeasureCommandOptions,
  ): Promise<void> {
    const workingDirectory = this.resolveWorkingDirectory();
    const plan = await this.resolveRunPlan(options, workingDirectory);

    if (plan === undefined) {
      return;
    }

    const { configuration, consoleMarkdown, destinations, format, mode } = plan;
    const outputPaths = this.destinationsService.listOutputPaths({
      destinations,
      workingDirectory,
    });

    this.announceOutputPaths(outputPaths);

    const measurement: MeasurementResult = this.measureService.measure({
      configuration,
      outputPaths,
      workingDirectory,
    });
    const report = this.reportService.build(measurement);
    const stalePaths = this.deliveryService.deliver({
      consoleMarkdown,
      destinations,
      format,
      measurement,
      mode,
      report,
      scope: this.destinationsService.selectScope(workingDirectory),
    });

    this.reportFindings({ measurement, mode, stalePaths });
  }
}
