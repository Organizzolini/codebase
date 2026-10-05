import { ConfigurationService, InputError } from "@conformetry/configuration";
import { GenerationService } from "@conformetry/generation";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logging";

import {
  DEFAULT_CONFIGURATION_PATH,
  removedGeneratorOptionError,
  unknownTemplateError,
} from "../../constants.js";

import {
  DEFAULT_GENERATED_DIRECTORY,
  missingTemplateError,
} from "./generate.constants";

import type { GenerateCommandOptions } from "./generate.types";
import type {
  ConformetryConfiguration,
  JsonSchemaDefinition,
} from "@conformetry/configuration";

/**
 * Renders a conformetry template from the configured registry.
 *
 * Unknown options are allowed through deliberately: a template's parameters
 * are not known until the template is chosen, so they cannot be declared as
 * flags ahead of time. They are matched against the template's own schema
 * instead. This is also why the template is selected with `--template` rather
 * than `--name` — nearly every template takes a `name` parameter, and
 * reserving that flag made it impossible to supply.
 *
 * `--template` is optional at the parse layer so a bare `generate` reaches
 * this command and can offer a picker instead of failing at argument parsing
 * with a name the reader would have had to look up elsewhere.
 */
@Command({
  allowUnknownOptions: true,
  description: "Render a template into a new instance",
  name: "generate",
})
@Injectable()
export class GenerateCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly generationService: GenerationService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(GenerateCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Resolves the template's inputs and writes its files. */
  private async generate(
    passedParameters: readonly string[],
    options: GenerateCommandOptions,
  ): Promise<void> {
    const rawArguments = [...passedParameters, ...process.argv.slice(2)];

    this.rejectRemovedGeneratorOption(rawArguments);

    const configuration =
      await this.configurationService.loadConformetryConfiguration(
        options.config ?? DEFAULT_CONFIGURATION_PATH,
      );
    const templateName = await this.resolveTemplateName({
      configuration,
      templateName: options.template,
    });

    this.logger.debug("🏗 Generating a conformetry instance", undefined, {
      template: templateName,
    });

    const definition = configuration.find((generator) => {
      return generator.name === templateName;
    });

    if (definition === undefined) {
      this.logger.error("🚫 Rejected an unknown template", undefined, {
        template: templateName,
      });
      throw unknownTemplateError({
        availableTemplateNames: configuration.map(
          (generator) => generator.name,
        ),
        templateName,
      });
    }

    // Every input is required, which is what `conformetry-nx` has always told
    // Nx about the same generators: a conformetry generator substitutes each
    // of its placeholders, and mustache renders a missing one as empty rather
    // than failing, so an optional input would silently produce a hole. This
    // command used to pass `properties` alone, leaving every input optional
    // and every missing one skipped — the hole nobody was warned about.
    const schema: JsonSchemaDefinition = {
      properties: definition.inputs,
      required: Object.keys(definition.inputs),
    };
    const inputs = await this.configurationService.resolveGeneratorInputs({
      rawArguments,
      schema,
    });
    const result = await this.generationService.runGenerator({
      definition: {
        name: definition.name,
        templateDirectoryPath: definition.templatePath,
      },
      inputs,
      instancePath:
        options.directory ??
        `${DEFAULT_GENERATED_DIRECTORY}/${definition.name}`,
    });

    // The file list is what the caller asked for, so it goes to stdout; the
    // log line carries the same facts as data a telemetry backend can group.
    process.stdout.write(
      `${result.generatedFilePaths.map((filePath) => `  ${filePath}`).join("\n")}\n`,
    );
    this.logger.info("✨ Generated instance files", undefined, {
      count: result.generatedFilePaths.length,
      outputDirectoryPath: result.outputDirectoryPath,
    });
  }

  /**
   * Logs a command line the input service refused, and fails the run.
   *
   * A required input that could not be asked for is the reader's own typing
   * to fix, so it is reported as a rejected command line rather than as a
   * crash. Nothing was generated, and the next move is to pass the flag it
   * named, not to read a stack trace.
   */
  private rejectCommandLine(error: InputError): void {
    this.logger.error("🚫 Rejected the command line", undefined, {
      reason: error.message,
    });
    process.exitCode = 1;
  }

  /**
   * Refuses the flag `--template` replaced, rather than ignoring it.
   *
   * Unknown options are allowed through so a template's own inputs can be
   * passed as flags, which means commander does not reject `--generator` for
   * this command the way it would for any other. Without this it would be
   * read as an input nothing declares and quietly discarded, leaving a stale
   * script to prompt or to fail for the wrong reason.
   */
  private rejectRemovedGeneratorOption(rawArguments: readonly string[]): void {
    const isRemovedOption = rawArguments.some((argument) => {
      return argument === "--generator" || argument.startsWith("--generator=");
    });

    if (isRemovedOption) {
      this.logger.error("🚫 Rejected a removed option", undefined, {
        option: "--generator",
      });
      throw removedGeneratorOptionError();
    }
  }

  /**
   * Settles which template to render: the one named, the one picked, or none.
   *
   * The missing case and the unknown case are decided together here rather
   * than split between argument parsing and the command body, which is what
   * lets the picker sit between them. Whether anybody can be asked is read
   * from the one predicate that knows — a non-terminal stdin is what once let
   * a prompt hang a CI job until it timed out.
   */
  private async resolveTemplateName(args: {
    configuration: ConformetryConfiguration;
    templateName: string | undefined;
  }): Promise<string> {
    if (args.templateName !== undefined) {
      return args.templateName;
    }

    const availableNames = args.configuration.map((generator) => {
      return generator.name;
    });

    if (!this.configurationService.isAtTerminal()) {
      throw missingTemplateError(availableNames);
    }

    // The loaded configuration is handed over as-is: a definition already
    // carries the name and description a choice needs, and mapping it here
    // would be a second source the picker could disagree with.
    const chosenName = await this.configurationService.promptForTemplate(
      args.configuration,
    );

    if (chosenName === undefined) {
      throw missingTemplateError(availableNames);
    }

    return chosenName;
  }

  // 🌎 Public Methods

  /** Parses the optional configuration path. */
  @Option({
    description: "Path to the conformetry configuration file",
    flags: "--config [path]",
  })
  public parseConfig(value: string | undefined): string | undefined {
    return this.configurationService.parseOptionalOption(value);
  }

  /** Parses the output directory override. */
  @Option({
    description: "Directory to write generated files into",
    flags: "--directory [path]",
  })
  public parseDirectory(value: string | undefined): string | undefined {
    return this.configurationService.parseOptionalOption(value);
  }

  /**
   * Parses the name of the template to render.
   *
   * Optional, so a bare `generate` is not rejected at argument parsing with a
   * name the reader has not been shown yet.
   */
  @Option({
    description: "Name of the template to render",
    flags: "--template [name]",
  })
  public parseTemplate(value: string | undefined): string | undefined {
    return this.configurationService.parseOptionalOption(value);
  }

  /**
   * Renders the template, reporting a refused command line as one.
   *
   * Only an `InputError` is caught: a required input nobody could be asked
   * for is a flag the caller has to pass, where anything else is a genuine
   * failure and keeps its stack.
   */
  public async run(
    passedParameters: string[],
    options: GenerateCommandOptions,
  ): Promise<void> {
    try {
      await this.generate(passedParameters, options);
    } catch (error) {
      if (!(error instanceof InputError)) {
        throw error;
      }

      this.rejectCommandLine(error);
    }
  }
}
