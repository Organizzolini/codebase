import {
  CHECK_NAMES,
  ConfigurationService,
  DEFAULT_JSON_INDENTATION,
  DEFAULT_PREVIEW_COUNT,
  DEFAULT_RUN_HEADING,
} from "@callidescope/configuration";
import { AddressService } from "@callidescope/graph";
import {
  MarkdownReportService,
  OutputJsonService,
  ReportFindingsService,
  WriteDestinationsService,
} from "@callidescope/output";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logging";

import { ADDRESS_NOT_FOUND_ADVICE } from "../address-lookup/address-lookup.constants";

import {
  buildUnknownCommandMessage,
  readRefusalHeadline,
  REJECTED_COMMAND_LINE,
  UnresolvedEntryPointAddressError,
} from "./callidescope.constants";
import { CallidescopeService } from "./callidescope.service";

import type {
  CallidescopeCommandOptions,
  CallidescopeOutputFormat,
  ProjectLimitsLookup,
  ResolvedCallidescopeConfiguration,
} from "@callidescope/configuration";
import type { CallGraphResult } from "@callidescope/core";
import type { UnresolvedEntryPointAddress } from "@callidescope/graph";
import type { LogData } from "@codebase/logging";

/**
 * CLI entry point for the call-stack tracing workflow.
 *
 * `isDefault` is what makes `callidescope --check depth` work, which is the
 * invocation every piece of documentation here has always shown and the only
 * one a reader would think to type — the honest alternative was
 * `callidescope callidescope`. It stays a named command as well, so the Nx
 * targets that spell it out keep working unchanged, and `depth`, `breadth`,
 * and `limits` are still matched by name before anything falls through here.
 */
@Command({
  description: "Run the callidescope command",
  name: "callidescope",
  options: { isDefault: true },
})
@Injectable()
export class CallidescopeCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly addressService: AddressService,
    private readonly callidescopeService: CallidescopeService,
    private readonly configurationService: ConfigurationService,
    private readonly outputJsonService: OutputJsonService,
    private readonly markdownReportService: MarkdownReportService,
    private readonly reportFindingsService: ReportFindingsService,
    private readonly writeDestinationsService: WriteDestinationsService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(CallidescopeCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * States why one declared address failed to resolve, naming the project and
   * the field that declared it.
   *
   * The field is named rather than left to be inferred, matching the sibling
   * refusal this shares a catch with — which says outright which fields a
   * project configuration may set instead of leaving the reader to guess.
   *
   * An ambiguous address's candidates are rendered by `AddressService`, the
   * same renderer `depth` and `breadth` print, so what a reader is handed for
   * a declared entry point and what they are handed for an address they typed
   * are one thing said one way.
   */
  private describeUnresolvedAddress(
    unresolvedAddress: UnresolvedEntryPointAddress,
  ): string {
    const label =
      unresolvedAddress.projectName ?? "the workspace configuration";
    const { address, resolution } = unresolvedAddress;

    if (resolution.kind === "not-found") {
      return `${label} declares an entryPoints.addresses entry that resolves to nothing: "${address}". ${ADDRESS_NOT_FOUND_ADVICE}`;
    }

    if (resolution.kind === "invalid") {
      return `${label} declares an invalid entryPoints.addresses entry. ${resolution.reason}`;
    }

    return `${label} declares an entryPoints.addresses entry that matches more than one declaration: "${address}". ${this.addressService.describeCandidates(
      { address, candidates: resolution.candidates },
    )}`;
  }

  /**
   * Logs one refusal under its own headline, and fails the run.
   *
   * One method for four refusal channels, because they are one act: a message
   * rather than a stack trace, because every one of them is about a file
   * somebody wrote or a command line somebody typed. Each is reached before
   * anything has been printed and before any destination has been touched, so
   * a refused run leaves the checkout exactly as it found it.
   */
  private reject(headline: string, data: LogData): void {
    this.logger.error(headline, undefined, data);
    process.exitCode = 1;
  }

  /**
   * Prints the run in the requested format.
   *
   * Markdown unless asked otherwise: it is the one rendering that reads well
   * in a terminal, pastes into an issue, and is already what the file
   * destinations write, so there is no second format to keep in step. A
   * diagram printed to a terminal is mermaid source, which is what someone
   * asking for one at a prompt wants to paste somewhere that renders it.
   */
  private report(args: {
    configuration: ResolvedCallidescopeConfiguration;
    format: CallidescopeOutputFormat;
    projectLimits: ProjectLimitsLookup;
    result: CallGraphResult;
  }): void {
    const { json } = args.configuration.write;

    if (args.format === "json") {
      process.stdout.write(
        this.outputJsonService.buildReport({
          destination: json ?? {
            indentation: DEFAULT_JSON_INDENTATION,
            path: "",
          },
          result: args.result,
        }),
      );

      return;
    }

    process.stdout.write(
      this.markdownReportService.renderRun({
        // Printed rather than spliced, so there is no destination to take a
        // heading or a description from and nothing above it to sit under.
        description: undefined,
        heading: DEFAULT_RUN_HEADING,
        limits: args.projectLimits,
        // The tool's own default rather than a destination's: a printed run
        // lands in a terminal, which is nobody's document to have configured.
        previewCount: DEFAULT_PREVIEW_COUNT,
        rendering: args.format === "mermaid" ? "diagram" : "tree",
        result: args.result,
      }),
    );
  }

  /** Traces the workspace, reports, and sets the exit code. */
  private async traceWorkspace(
    options: CallidescopeCommandOptions,
  ): Promise<void> {
    const resolvedOptions =
      await this.configurationService.resolveFormatOption(options);
    const { errors, run } =
      await this.configurationService.prepareRun(resolvedOptions);

    if (run === undefined) {
      // The one headline every refused command line is reported under,
      // whichever of the two gates in the configuration layer refused it.
      this.reject(REJECTED_COMMAND_LINE, { reasons: errors });
      return;
    }

    // The format as it was typed rather than as it resolved: this line says
    // what the run was asked for, and an absent flag is part of that.
    this.logger.debug("🔭 Starting a call-stack trace", undefined, {
      format: resolvedOptions.format,
      workspaceRoot: run.workspaceRoot,
    });

    const {
      authoredLimits,
      configuration,
      configurationPath,
      format,
      limitOverrides,
      mode,
      workspaceRoot,
    } = run;

    const outcome = await this.callidescopeService.trace({
      authoredLimits,
      configuration,
      configurationPath,
      // Read off the configuration rather than the options: the flag and the
      // configured list were already merged by the one resolver that does
      // that, so choosing between them again here is how they came to
      // disagree.
      directories: configuration.directories,
      // Carried past the resolved configuration: a limit is enforced per
      // project, so an override left in the workspace's copy alone would be a
      // flag no gate ever reads.
      limitOverrides,
      workspaceRoot,
    });

    // Checked before anything is printed or written, like every other refusal.
    if (outcome.unresolvedAddresses.length > 0) {
      throw new UnresolvedEntryPointAddressError(
        outcome.unresolvedAddresses.map((unresolvedAddress) =>
          this.describeUnresolvedAddress(unresolvedAddress),
        ),
      );
    }

    this.report({
      configuration,
      format,
      projectLimits: outcome.projectLimits,
      result: outcome.result,
    });

    // Reports are produced before either finding is weighed, so a run that
    // writes and gates leaves its reports behind even when the gate trips.
    const stalePaths = this.configurationService.touchesFiles(mode)
      ? this.writeDestinationsService.syncDestinations({
          check: mode.checksReports,
          configuration,
          projectLimits: outcome.projectLimits,
          result: outcome.result,
          startingProjectRoots: outcome.startingProjectRoots,
          writeByProject: outcome.writeByProject,
        })
      : [];

    this.logger.info("🔭 Finished a call-stack trace", undefined, {
      deepStackCount: outcome.result.deepStacks.length,
      staleReportCount: stalePaths.length,
      wideCallableCount: outcome.result.wideCallables.length,
    });

    this.reportFindingsService.reportFindings({
      mode,
      result: outcome.result,
      stalePaths,
    });
  }

  // 🌎 Public Methods

  /**
   * Parses the set of things the run fails on.
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

  /** Parses `--config`. */
  @Option({
    description: "Path to a callidescope configuration file",
    flags: "--config [config]",
  })
  public parseConfig(value: string | undefined): string | undefined {
    return this.configurationService.parseOptionalOption(value);
  }

  /** Parses `--directories`, a comma-separated list of project directories. */
  @Option({
    description: "Comma-separated project directories to trace",
    flags: "-d, --directories [directories]",
  })
  public parseDirectories(value: string | undefined): string[] {
    return this.configurationService.parseCommaDelimitedOption(value);
  }

  /** Parses `--entry-point-addresses`, overriding `entryPoints.addresses`. */
  @Option({
    description: "Comma-separated callable addresses to root stacks at",
    flags: "--entry-point-addresses [entryPointAddresses]",
  })
  public parseEntryPointAddresses(value: string | undefined): string[] {
    return this.configurationService.parseCommaDelimitedOption(value);
  }

  /** Parses `--entry-point-decorators`, overriding `entryPoints.decorators`. */
  @Option({
    description: "Comma-separated decorators whose methods a framework invokes",
    flags: "--entry-point-decorators [entryPointDecorators]",
  })
  public parseEntryPointDecorators(value: string | undefined): string[] {
    return this.configurationService.parseCommaDelimitedOption(value);
  }

  /** Parses `--exclude`, overriding `exclude`. */
  @Option({
    description: "Comma-separated globs to leave untraced",
    flags: "--exclude [exclude]",
  })
  public parseExclude(value: string | undefined): string[] {
    return this.configurationService.parseCommaDelimitedOption(value);
  }

  /** Parses `--exclude-callees`, overriding `excludeCallees`. */
  @Option({
    description: "Comma-separated display-name globs to drop calls landing on",
    flags: "--exclude-callees [excludeCallees]",
  })
  public parseExcludeCallees(value: string | undefined): string[] {
    return this.configurationService.parseCommaDelimitedOption(value);
  }

  /**
   * Parses `--format`, which decides what the run prints.
   *
   * Carried through as written rather than narrowed here: which values exist
   * is the resolver's to decide, and a value nobody recognizes has to reach
   * it to be refused rather than quietly rewritten to markdown on the way.
   */
  @Option({
    description: "What to print: markdown, mermaid, or json",
    flags: "-f, --format [format]",
  })
  public parseFormat(value: string | undefined): string | undefined {
    return this.configurationService.parseOptionalOption(value);
  }

  /**
   * Parses `--include-exported-functions`, overriding the entry-point rule.
   *
   * Carried through as written, like `--format`: the resolver that knows what
   * a switch accepts is the one that refuses a value nobody recognizes.
   */
  @Option({
    description: 'Treat every src/index.ts export as a root: "true" or "false"',
    flags: "--include-exported-functions [includeExportedFunctions]",
  })
  public parseIncludeExportedFunctions(
    value: string | undefined,
  ): string | undefined {
    return this.configurationService.parseOptionalOption(value);
  }

  /** Parses `--include-orphans`, overriding the entry-point rule. */
  @Option({
    description: 'Promote callables nothing calls: "true" or "false"',
    flags: "--include-orphans [includeOrphans]",
  })
  public parseIncludeOrphans(value: string | undefined): string | undefined {
    return this.configurationService.parseOptionalOption(value);
  }

  /** Parses `--include-tests`, overriding the entry-point rule. */
  @Option({
    description: 'Trace test files too: "true" or "false"',
    flags: "--include-tests [includeTests]",
  })
  public parseIncludeTests(value: string | undefined): string | undefined {
    return this.configurationService.parseOptionalOption(value);
  }

  /** Parses `--json`. */
  @Option({
    description:
      "Where the JSON report goes when --write or --check reports asks for it",
    flags: "--json [json]",
  })
  public parseJson(value: string | undefined): string | undefined {
    return this.configurationService.parseOptionalOption(value);
  }

  /** Parses `--markdown`. */
  @Option({
    description:
      "Where the markdown block goes when --write or --check reports asks for it",
    flags: "-m, --markdown [markdown]",
  })
  public parseMarkdown(value: string | undefined): string | undefined {
    return this.configurationService.parseOptionalOption(value);
  }

  /**
   * Parses `--maximum-breadth`, overriding `limits.maximumBreadth`.
   *
   * A required value rather than an optional one, unlike every flag above: a
   * limit written with nothing after it is a mistake commander refuses on its
   * own, in better words than the resolver could.
   */
  @Option({
    description: "Override the configured limits.maximumBreadth",
    flags: "--maximum-breadth <maximumBreadth>",
  })
  public parseMaximumBreadth(value: string | undefined): string | undefined {
    return this.configurationService.parseOptionalOption(value);
  }

  /** Parses `--maximum-depth`, overriding `limits.maximumDepth`. */
  @Option({
    description: "Override the configured limits.maximumDepth",
    flags: "--maximum-depth <maximumDepth>",
  })
  public parseMaximumDepth(value: string | undefined): string | undefined {
    return this.configurationService.parseOptionalOption(value);
  }

  /** Parses `--mermaid`. */
  @Option({
    description:
      "Where the mermaid block goes when --write or --check reports asks for it",
    flags: "--mermaid [mermaid]",
  })
  public parseMermaid(value: string | undefined): string | undefined {
    return this.configurationService.parseOptionalOption(value);
  }

  /**
   * Parses `--write`, which asks for every configured destination to be
   * rewritten.
   *
   * A boolean flag reaches the parser as `undefined` when it carries no value,
   * and the parser runs only when the flag is present, so presence is the whole
   * signal.
   */
  @Option({
    description: "Write every configured destination",
    flags: "--write",
  })
  public parseWrite(value: boolean | undefined): boolean {
    return value ?? true;
  }

  /**
   * Traces the workspace, reports, and sets the exit code.
   *
   * The flags are independent: `--write` writes, `--check reports` fails on a
   * stale report, `--check depth` fails on a stack that ran too deep, and none
   * of them turns another on. A run given neither `--write` nor
   * `--check reports` leaves every file alone.
   *
   * A positional argument is refused rather than ignored. This command is the
   * default one, so anything commander could not match as a subcommand arrives
   * here as an operand instead of as `unknown command` — and a `deep` typed
   * where `depth` was meant, quietly tracing the whole workspace and passing,
   * would be a worse answer than the error it replaced.
   */
  public async run(
    passedParameters: string[],
    options: CallidescopeCommandOptions,
  ): Promise<void> {
    const [unexpected] = passedParameters;

    if (unexpected !== undefined) {
      this.reject(REJECTED_COMMAND_LINE, {
        reason: buildUnknownCommandMessage(unexpected),
      });
      return;
    }

    try {
      await this.traceWorkspace(options);
    } catch (error) {
      const headline = readRefusalHeadline(error);

      if (headline === undefined || !(error instanceof Error)) {
        throw error;
      }

      this.reject(headline, { reason: error.message });
    }
  }
}
