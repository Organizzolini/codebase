import { ConfigurationService } from "@conformetry/configuration";
import { InventoryService } from "@conformetry/output";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logging";

import { DEFAULT_CONFIGURATION_PATH, JSON_INDENT } from "../../constants.js";

import {
  NO_INSTANCES_MESSAGE,
  NO_MATCHES_MESSAGE,
} from "./instances.constants.js";

import type { InstancesCommandOptions } from "./instances.types.js";

/**
 * Lists every instance the configured globs find, and which templates explain
 * each one.
 *
 * Each path printed is usable as the `--instances` argument to the templates
 * command, so the two read as one pair: this side answers "what is generated
 * code here", the other answers "what standard does this path answer to".
 *
 * Output goes to standard output rather than through the logger, which asserts
 * every message opens with an emoji and a verb — right for a log line, wrong
 * for a listing.
 */
@Command({
  description:
    "List the generated code the configuration finds, and what explains it",
  name: "instances",
})
@Injectable()
export class InstancesCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly inventoryService: InventoryService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(InstancesCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Parses the optional configuration path. */
  @Option({
    description: "Path to the conformetry configuration file",
    flags: "--config [path]",
  })
  public parseConfig(value: string | undefined): string | undefined {
    return this.configurationService.parseOptionalOption(value);
  }

  /** Selects the machine-readable listing. */
  @Option({
    description: "Write the listing as JSON",
    flags: "--json",
  })
  public parseJson(): boolean {
    return true;
  }

  /** Parses the optional template filter. */
  @Option({
    description:
      "Comma-separated template names; report only the instances they explain",
    flags: "--templates [names]",
  })
  public parseTemplates(value: string | undefined): string[] | undefined {
    return this.configurationService.parseCommaDelimitedOption(value);
  }

  /** Writes every instance found, filtered to the given templates. */
  public async run(
    _passedParameters: string[],
    options: InstancesCommandOptions,
  ): Promise<void> {
    this.logger.debug("📋 Listing conformetry instances", undefined, {
      templateFilter: options.templates,
    });

    const workingDirectory = process.cwd();
    const configuration =
      await this.configurationService.loadConformetryConfiguration(
        options.config ?? DEFAULT_CONFIGURATION_PATH,
      );
    const instances = this.inventoryService.shortenInstancePaths({
      instances: this.configurationService.resolveInventoriedInstances({
        configuration,
        ...(options.templates === undefined
          ? {}
          : { templateNames: options.templates }),
        workingDirectory,
      }),
      workingDirectory,
    });

    if (options.json === true) {
      console.info(JSON.stringify(instances, undefined, JSON_INDENT));
      return;
    }

    if (instances.length === 0) {
      console.info(
        options.templates === undefined
          ? NO_INSTANCES_MESSAGE
          : NO_MATCHES_MESSAGE,
      );
      return;
    }

    console.info(this.inventoryService.describeInstances(instances).join("\n"));
  }
}
