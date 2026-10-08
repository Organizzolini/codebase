import { Injectable } from "@nestjs/common";

import { ConfigurationFlagsService } from "./configuration-flags.service";
import { ConfigurationLoaderService } from "./configuration-loader.service";
import { ConfigurationResolverService } from "./configuration-resolver.service";

import type {
  CodometerConfiguration,
  CodometerFormat,
  LoadConfigurationArguments,
  MeasureCommandOptions,
  MeasureFormat,
  ModeSelection,
} from "./configuration.types";
import type {
  LoadedConfiguration,
  ResolvedCodometerConfiguration,
} from "./resolved.types";

/**
 * Answers what a codometer run is configured to do.
 *
 * The configuration layer's one public entry point. The file says what to
 * measure, and the flags beside it say what to do about what was measured;
 * both are answered here, so a command injects this and nothing else from
 * this package.
 *
 * It composes rather than implements. Finding and reading a file is
 * `ConfigurationLoaderService`, filling one in is
 * `ConfigurationResolverService`, and reading a command line is
 * `ConfigurationFlagsService` — three package-internal collaborators, none of
 * them reachable from outside. What the configuration *means* — which files an
 * exclusion glob removes, where a badge block is spliced in — belongs to the
 * analyzers that read it, so that reading a configuration stays free of any
 * knowledge of the repository being measured.
 */
@Injectable()
export class ConfigurationService {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationLoaderService: ConfigurationLoaderService,
    private readonly configurationResolverService: ConfigurationResolverService,
    private readonly configurationFlagsService: ConfigurationFlagsService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Loads and validates a codometer configuration file.
   *
   * A path that was named explicitly must exist — a typo in a task runner's
   * arguments should fail rather than quietly measure the repository with
   * defaults it never asked for. A path that was not named is searched for
   * from the measured directory upward, and its absence is legal.
   *
   * The nearest configuration file wins outright: nothing from a further
   * ancestor is folded into it. Merging the two would leave a limit that never
   * applied looking exactly like one that did, and the only way to tell them
   * apart would be to know which of several files each field came from.
   */
  public async loadConfiguration(
    args: LoadConfigurationArguments = {},
  ): Promise<ResolvedCodometerConfiguration> {
    const { configuration } = await this.loadConfigurationFile(args);

    return configuration;
  }

  /**
   * Loads a configuration and says which file answered.
   *
   * The same work as `loadConfiguration`, keeping the path the upward walk
   * settled on. A caller measuring one directory has no use for it — the
   * configuration is the whole answer — but one listing what a repository
   * configures has to attribute each answer to the file that gave it, and
   * nothing downstream of the walk can still tell.
   */
  public async loadConfigurationFile(
    args: LoadConfigurationArguments = {},
  ): Promise<LoadedConfiguration> {
    const loaded = await this.configurationLoaderService.load(args);

    if (loaded === undefined) {
      // Validated through the same schema as a file's contents rather than
      // resolved directly, so a repository with no configuration file at all
      // fails on a missing `format` exactly like one whose file forgot it —
      // there is no code-level fallback for either.
      return {
        configuration: this.resolveConfiguration(this.parseConfiguration({})),
        path: undefined,
      };
    }

    return {
      configuration: this.resolveConfiguration(
        this.parseConfiguration(loaded.configuration),
      ),
      path: loaded.path,
    };
  }

  /** Validates a configuration object, refusing it in prose rather than JSON. */
  public parseConfiguration(configuration: unknown): CodometerConfiguration {
    return this.configurationResolverService.parseConfiguration(configuration);
  }

  /** Reads an option that carries a default when it was left off. */
  public parseDefaultedOption(value: unknown, fallback: string): string {
    return this.configurationFlagsService.parseDefaultedOption(value, fallback);
  }

  /** Reads a directory option, falling back to the working directory. */
  public parseDirectoryOption(value: unknown): string {
    return this.configurationFlagsService.parseDirectoryOption(value);
  }

  /** Reads an option that carries text, or nothing at all. */
  public parseOptionalOption(value: unknown): string | undefined {
    return this.configurationFlagsService.parseOptionalOption(value);
  }

  /** Fills in every field a configuration file may leave out. */
  public resolveConfiguration(
    configuration: CodometerConfiguration,
  ): ResolvedCodometerConfiguration {
    return this.configurationResolverService.resolveConfiguration(
      configuration,
    );
  }

  /** Reads `--format` into what the run prints, or the configured format. */
  public resolveFormat(
    value: string | undefined,
    configuredFormat: CodometerFormat,
    errors: string[],
  ): MeasureFormat | undefined {
    return this.configurationFlagsService.resolveFormat(
      value,
      configuredFormat,
      errors,
    );
  }

  /** Reads the flags into what the run writes and what it fails on. */
  public selectMode(options: MeasureCommandOptions): ModeSelection {
    return this.configurationFlagsService.selectMode(options);
  }
}
