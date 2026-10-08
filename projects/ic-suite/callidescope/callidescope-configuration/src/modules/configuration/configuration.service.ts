import { Injectable } from "@nestjs/common";

import { InputService } from "../input/input.service";
import { RunPlanService } from "../run-plan/run-plan.service";

import { ConfigurationFileService } from "./configuration-file.service";
import { CALLIDESCOPE_OUTPUT_FORMATS } from "./configuration.constants";
import { ProjectConfigurationService } from "./project-configuration.service";

import type { CallidescopeFormatOptions } from "../input/input.types";
import type {
  AddressCommandOptions,
  CallidescopeCommandOptions,
  PreparedLookup,
  RunMode,
  RunPreparation,
} from "../run-plan/run-plan.types";
import type { ConfigurationFileReader } from "./configuration-file.types";
import type {
  CallidescopeConfiguration,
  LoadConfigurationArguments,
  LoadedCallidescopeConfiguration,
  LoadedCallidescopeConfigurationFile,
  LoadedProjectConfiguration,
  LoadProjectConfigurationsArguments,
  ProjectLimitsLookup,
  ResolvedCallidescopeConfiguration,
  ResolveProjectLimitsArguments,
} from "./configuration.types";

/**
 * The one answer to "what is this run actually configured to do".
 *
 * Every question a caller outside this package can ask about configuration is
 * asked here: what a file declares, what a project is gated by, what a command
 * line resolved to, and what to ask a person for when a flag was left off. A
 * consumer therefore injects this and nothing else from this package, which is
 * what makes the configuration layer one layer rather than a bag of
 * collaborators a caller has to know the names of.
 *
 * Nearly every method here forwards and nothing more. Loading a file, judging
 * a project's own file, planning a run from flags, and prompting are four
 * different jobs and stay four classes in four files behind this one; what
 * they stop being is four public entry points. A facade that implemented any
 * of them would be a facade in name only, and the one-per-job split is what
 * keeps each of them readable.
 *
 * `resolveFormatOption` is the exception, and a small one: deciding whether to
 * offer a prompt at all is a policy over two collaborators rather than work
 * either of them does, and it reads a constant the prompting service must not
 * import. Its whole body is that decision.
 */
@Injectable()
export class ConfigurationService implements ConfigurationFileReader {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationFileService: ConfigurationFileService,
    private readonly inputService: InputService,
    private readonly projectConfigurationService: ProjectConfigurationService,
    private readonly runPlanService: RunPlanService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Finds a configuration file sitting directly at one directory. */
  public findConfigurationFileAt(directory: string): string | undefined {
    return this.configurationFileService.findConfigurationFileAt(directory);
  }

  /**
   * Loads a configuration, and says what the file itself declared and which
   * file answered.
   */
  public loadConfigurationFile(
    args: LoadConfigurationArguments & { configurationPath: string },
  ): Promise<LoadedCallidescopeConfigurationFile>;
  public loadConfigurationFile(
    args?: LoadConfigurationArguments,
  ): Promise<LoadedCallidescopeConfiguration>;
  public async loadConfigurationFile(
    args: LoadConfigurationArguments = {},
  ): Promise<LoadedCallidescopeConfiguration> {
    return await this.configurationFileService.loadConfigurationFile(args);
  }

  /** Loads and validates every traced project's own configuration file. */
  public async loadProjectConfigurations(
    args: LoadProjectConfigurationsArguments,
  ): Promise<LoadedProjectConfiguration[]> {
    return await this.projectConfigurationService.loadProjectConfigurations(
      args,
      this,
    );
  }

  /** Splits a comma-separated flag value into its parts. */
  public parseCommaDelimitedOption(value: string | undefined): string[] {
    return this.inputService.parseCommaDelimitedOption(value);
  }

  /** Reads a flag that may have been written without a value. */
  public parseOptionalOption(value: string | undefined): string | undefined {
    return this.inputService.parseOptionalOption(value);
  }

  /** Reads a lookup's scoping flags into a workspace root and a configuration. */
  public async prepareLookup(
    options: AddressCommandOptions,
  ): Promise<PreparedLookup> {
    return await this.runPlanService.prepareLookup(options, this);
  }

  /** Reads a command line and its configuration into what the run will do. */
  public async prepareRun(
    options: CallidescopeCommandOptions,
  ): Promise<RunPreparation> {
    return await this.runPlanService.prepareRun(options, this);
  }

  /** Prompts for several values at once, completing the list as it is typed. */
  public async promptForAutocompleteMultiselect(args: {
    message: string;
    subject: string;
    suggestions: readonly string[];
  }): Promise<string[]> {
    return await this.inputService.promptForAutocompleteMultiselect(args);
  }

  /** Prompts for one value out of a fixed set of choices. */
  public async promptForSelect<Choice extends string>(args: {
    choices: readonly Choice[];
    message: string;
    subject: string;
  }): Promise<Choice> {
    return await this.inputService.promptForSelect(args);
  }

  /** Fills in every field a configuration file may leave out. */
  public resolveConfiguration(
    configuration: CallidescopeConfiguration,
  ): ResolvedCallidescopeConfiguration {
    return this.configurationFileService.resolveConfiguration(configuration);
  }

  /**
   * Returns the given options with `--format` filled in where one is wanted.
   *
   * Offered rather than required, which is the one place this differs from
   * every other missing value: the caller applies its own default when
   * nobody is at a terminal to ask, so a run proceeds with nothing typed.
   * Demanding it would fail every scripted run — this repository's own
   * per-project `gate` among them — over a flag those runs have never needed
   * to pass.
   *
   * Generic over the caller's options type, so a command carries its own
   * other flags through unchanged.
   */
  public async resolveFormatOption<Options extends CallidescopeFormatOptions>(
    options: Options,
  ): Promise<Options> {
    if (options.format !== undefined || !this.inputService.isAtTerminal()) {
      return options;
    }

    const format = await this.promptForSelect({
      choices: CALLIDESCOPE_OUTPUT_FORMATS,
      message: "Which output format?",
      subject: "An output format (--format)",
    });

    return { ...options, format };
  }

  /** Resolves the limits every traced project is judged against. */
  public resolveLimits(
    args: ResolveProjectLimitsArguments,
  ): ProjectLimitsLookup {
    return this.projectConfigurationService.resolveLimits(args);
  }

  /** Whether a run reads or rewrites the files its reports live in. */
  public touchesFiles(mode: RunMode): boolean {
    return this.runPlanService.touchesFiles(mode);
  }
}
