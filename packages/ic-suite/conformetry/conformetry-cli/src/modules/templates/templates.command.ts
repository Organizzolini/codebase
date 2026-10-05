import { ConfigurationService } from "@conformetry/configuration";
import { InventoryService } from "@conformetry/output";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logging";

import { DEFAULT_CONFIGURATION_PATH, JSON_INDENT } from "../../constants.js";

import {
  NO_MATCHES_MESSAGE,
  NO_TEMPLATES_MESSAGE,
} from "./templates.constants.js";

import type { TemplatesCommandOptions } from "./templates.types.js";

/**
 * Names every template the configuration declares, and which instances each
 * explains.
 *
 * With `--instances` it answers the other direction — which templates explain a
 * given path. That is one command rather than two because a path can belong to
 * several templates at once: nothing records where an instance came from, so
 * attribution is inferred from file overlap and ties are real.
 *
 * Output goes to standard output rather than through the logger, which asserts
 * every message opens with an emoji and a verb — right for a log line, wrong
 * for a listing.
 */
@Command({
  description:
    "Name the templates the configuration declares, or which ones explain a path",
  name: "templates",
})
@Injectable()
export class TemplatesCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly inventoryService: InventoryService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(TemplatesCommand.name);
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

  /** Parses the optional instance filter. */
  @Option({
    description:
      "Comma-separated paths or globs; report only the templates that explain them",
    flags: "--instances [globs]",
  })
  public parseInstances(value: string | undefined): string[] | undefined {
    return this.configurationService.parseCommaDelimitedOption(value);
  }

  /** Selects the machine-readable listing. */
  @Option({
    description: "Write the listing as JSON",
    flags: "--json",
  })
  public parseJson(): boolean {
    return true;
  }

  /** Writes every declared template, filtered to the given instances. */
  public async run(
    _passedParameters: string[],
    options: TemplatesCommandOptions,
  ): Promise<void> {
    this.logger.debug("📋 Listing conformetry templates", undefined, {
      instanceFilter: options.instances,
    });

    const workingDirectory = process.cwd();
    const configuration =
      await this.configurationService.loadConformetryConfiguration(
        options.config ?? DEFAULT_CONFIGURATION_PATH,
      );
    const templates = this.inventoryService.shortenTemplatePairings({
      templates: this.configurationService.resolveInventoriedTemplates({
        configuration,
        ...(options.instances === undefined
          ? {}
          : { instancePatterns: options.instances }),
        workingDirectory,
      }),
      workingDirectory,
    });

    if (options.json === true) {
      console.info(JSON.stringify(templates, undefined, JSON_INDENT));
      return;
    }

    if (templates.length === 0) {
      console.info(
        options.instances === undefined
          ? NO_TEMPLATES_MESSAGE
          : NO_MATCHES_MESSAGE,
      );
      return;
    }

    console.info(
      this.inventoryService
        .describeTemplates({
          showInstances: options.instances !== undefined,
          templates,
        })
        .join("\n"),
    );
  }
}
