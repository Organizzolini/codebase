import path from "node:path";

import { ConfigurationService as CodometerConfigurationService } from "@codometer/configuration";
import {
  ConfigurationListingService,
  RenderConfigurationService,
} from "@codometer/output";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logging";

import {
  CONFIGURATION_FORMATS,
  DEFAULT_CONFIGURATION_FORMAT,
} from "./configuration.constants";

import type { ConfigurationCommandOptions } from "./configuration.types";

/**
 * CLI entry point for listing what a repository configures.
 *
 * Reports configuration and never measurement: no build is required, nothing
 * is compressed, and no limit is evaluated. That separation is the point — a
 * repository whose limits live one per project has no single place left to
 * read them as a set, and this is that place, without waiting on the builds
 * a measurement would need.
 */
@Command({
  description: "List the codometer configuration found beneath a directory",
  name: "configuration",
})
@Injectable()
export class ConfigurationCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly codometerConfigurationService: CodometerConfigurationService,
    private readonly configurationService: ConfigurationListingService,
    private readonly renderConfigurationService: RenderConfigurationService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(ConfigurationCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Parse the configuration file answering for the walk root.
   *
   * The exclusions the walk uses come from whatever configuration answers for
   * the directory being listed, and a workspace stating its shared object
   * somewhere every project spreads it from has nothing at its own root for
   * the upward search to find — so it names that file here, the same way its
   * measurement target already does.
   */
  @Option({
    description:
      "Path to the configuration file answering for the directory being listed",
    flags: "--config [config]",
  })
  public parseConfig(value: string | undefined): string | undefined {
    return value;
  }

  /** Parse the directory to look for configuration files beneath. */
  @Option({
    description: "Directory to look for configuration files beneath",
    flags: "-d, --directory [directory]",
  })
  public parseDirectory(value: unknown): string {
    return this.codometerConfigurationService.parseDirectoryOption(value);
  }

  /** Parse the output format the listing is rendered in. */
  @Option({
    description: `Output format, one of ${CONFIGURATION_FORMATS.join(", ")}`,
    flags: "-f, --format [format]",
  })
  public parseFormat(value: unknown): string {
    return this.codometerConfigurationService.parseDefaultedOption(
      value,
      DEFAULT_CONFIGURATION_FORMAT,
    );
  }

  /** Parse whether to list only the limits. */
  @Option({
    description: "List only the configured limits",
    flags: "--limits",
  })
  public parseLimits(): boolean {
    return true;
  }

  /**
   * Lists what the tree beneath the given directory configures.
   *
   * Writes to standard output rather than a file: the listing is something a
   * reader looks at or pipes onward, and unlike a measurement it has no report
   * anything else consumes.
   */
  async run(
    _passedParameters: string[],
    options: ConfigurationCommandOptions = {},
  ): Promise<void> {
    const format = options.format ?? DEFAULT_CONFIGURATION_FORMAT;

    if (!(CONFIGURATION_FORMATS as readonly string[]).includes(format)) {
      throw new Error(
        `--format does not accept "${format}". It takes one of ${CONFIGURATION_FORMATS.join(" and ")}.`,
      );
    }

    const workingDirectory = path.resolve(options.directory ?? process.cwd());
    const { described, rootError } =
      await this.configurationService.describeConfigurations({
        configurationPath: options.config,
        workingDirectory,
      });

    this.logger.info("🔧 Listed the codometer configuration", undefined, {
      configurationCount: described.length,
      unreadableCount: described.filter((entry) => entry.error !== undefined)
        .length,
    });

    // The listing survives a walk root nothing answers for, but the run does
    // not pass: a zero exit code would say the repository's configuration was
    // read when the exclusions it declares were never consulted.
    if (rootError !== undefined) {
      this.logger.error(
        "🔧 Found no configuration answering for the walk root",
        undefined,
        { reason: rootError },
      );
      process.exitCode = 1;
    }

    const document = this.renderConfigurationService.render({
      described,
      format,
      limitRows: this.configurationService.toLimitRows(described),
      limitsOnly: options.limits === true,
      rootError,
    });

    process.stdout.write(`${document}\n`);
  }
}
