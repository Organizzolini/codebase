import {
  ALL_TEMPLATES_SELECTION,
  ConfigurationService,
} from "@conformetry/configuration";
import { ReportingService } from "@conformetry/output";
import { ValidationService } from "@conformetry/validation";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logging";

import {
  DEFAULT_CONFIGURATION_PATH,
  unknownTemplateError,
} from "../../constants.js";

import type { ValidateCommandOptions } from "./validate.types.js";
import type {
  ConformetryConfiguration,
  ConformetryGeneratorDefinition,
  ConformetryInstanceGroup,
  Instance,
} from "@conformetry/configuration";
import type { RunValidationResult } from "@conformetry/validation";

/**
 * Validates instances against their conformetry templates.
 *
 * Which paths are instances comes from the configuration's `instances` globs,
 * which `--instances` overrides for a one-off run, and `--templates` narrows
 * the other half of the pairing. Neither flag overrides the other: each
 * removes candidates from one side before templates and instances are paired,
 * so a run is their intersection.
 *
 * `--templates` is the one option that is asked for when absent, because it
 * is the one whose absence is genuinely a question rather than a default. It
 * is asked only where somebody can answer: with no terminal the run falls
 * back to every template, which is exactly what every invocation predating
 * this flag already did.
 */
@Command({
  description:
    "Measure instances against their templates and report every difference",
  name: "validate",
})
@Injectable()
export class ValidateCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly reportingService: ReportingService,
    private readonly validationService: ValidationService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(ValidateCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Describes why the run failed, naming the instances that fell short.
   *
   * A file count alone stopped being the whole story once thresholds existed:
   * findings can be printed for an instance that still passed, so the message
   * has to say which instances actually failed and by how much.
   */
  private describeFailure(result: RunValidationResult): string {
    const failed = result.scores.filter((score) => !score.ok);
    const reasons = [
      ...failed.map((score) => {
        return `${score.instancePath} scored ${this.reportingService.formatPercentage(score.score)} against ${score.templateName} (threshold ${this.reportingService.formatPercentage(score.threshold)})`;
      }),
      ...(result.unmatched.length === 0
        ? []
        : [
            `${String(result.unmatched.length)} instance(s) matched no template`,
          ]),
    ];

    return `Validation failed: ${reasons.join("; ")}.`;
  }

  /**
   * Expands every configured glob group into instances, or the single
   * override group `--instances` supplies.
   *
   * Groups exist so that substitutions can differ per glob: `type` is
   * `packages` for one set of paths and `applications` for another, and no
   * generic rule can tell them apart.
   */
  private findInstances(args: {
    groups: ConformetryInstanceGroup[];
    workingDirectory: string;
  }): Instance[] {
    // Tag-scoped groups are dropped rather than expanded: their globs are read
    // inside each project their tags select, and this host resolves no tags.
    return this.configurationService
      .readWorkspaceGroups(args.groups)
      .flatMap((group) => {
        return this.configurationService.findInstances({
          // A group may name only labels, which this host has nothing to match
          // them against — it locates instances by glob alone.
          patterns: group.patterns ?? [],
          ...(group.substitutions === undefined
            ? {}
            : { substitutions: group.substitutions }),
          ...(group.threshold === undefined
            ? {}
            : { threshold: group.threshold }),
          workingDirectory: args.workingDirectory,
        });
      });
  }

  /**
   * Offers a picker, or declines to ask where nobody could answer.
   *
   * Declining resolves to no selection rather than to a refusal, which is
   * where this parts company with `generate`: a template that cannot be
   * chosen leaves that command with nothing to render, where this one still
   * has a whole workspace to validate.
   *
   * The loaded configuration is handed over as-is — a definition already
   * carries the name and description a choice needs, so mapping it here would
   * be a second source the picker could disagree with.
   */
  private async promptForTemplateNames(
    configuration: ConformetryConfiguration,
  ): Promise<string[] | undefined> {
    if (!this.configurationService.isAtTerminal()) {
      return undefined;
    }

    return this.configurationService.promptForTemplates(configuration);
  }

  /**
   * Reports a narrowing that matched nothing, as itself.
   *
   * A run with no instances produces no findings, and a report rendering no
   * findings is indistinguishable from a clean one — which would turn naming
   * a real template that happens to have nothing under it into a green
   * result. The reader is told nothing matched instead.
   */
  private reportEmptySelection(
    selectedTemplates: ConformetryGeneratorDefinition[],
  ): void {
    const templateNames = selectedTemplates.map((template) => template.name);
    // A template whose every group is tag-scoped was never searched for at
    // all, which is a different answer from having been searched for and not
    // found — and the reader's next move is a different command, not an edit.
    const tagScopedNames = selectedTemplates
      .filter((template) => {
        return (
          template.instances.length > 0 &&
          this.configurationService.readWorkspaceGroups(template.instances)
            .length === 0
        );
      })
      .map((template) => template.name);

    process.stdout.write(
      [
        `No instances belong to ${templateNames.join(", ")}, so nothing was checked.`,
        ...(tagScopedNames.length === 0
          ? []
          : [
              `${tagScopedNames.join(", ")} locates instances by project tag, which this host cannot resolve. Run validation through @conformetry/nx, or pass --instances with the paths to check.`,
            ]),
        "",
      ].join("\n"),
    );
    this.logger.info("🫙 Validated nothing", undefined, {
      tagScopedNames,
      templateNames,
    });
  }

  /**
   * Writes the report and fails the run when anything fell short.
   *
   * The report is the command's product, not a log line: it is a multi-line
   * document written for a reader, and routing it through the logger would
   * both bury it in log framing and force prose no telemetry can group on.
   */
  private reportResult(args: {
    result: RunValidationResult;
    workingDirectory: string;
  }): void {
    process.stdout.write(
      `${this.reportingService.formatReport({
        fileResults: args.result.fileResults,
        scores: args.result.scores,
        workingDirectory: args.workingDirectory,
      })}\n`,
    );

    const failedCount = args.result.scores.filter((score) => !score.ok).length;
    const unmatchedCount = args.result.unmatched.length;

    this.logger.info("👔 Validated conformetry instances", undefined, {
      count: args.result.checkedPaths.length,
      failedCount,
      unmatchedCount,
    });

    if (!args.result.ok) {
      process.exitCode = 1;
      this.logger.warn("⚠️ Rejected non-conforming instances", undefined, {
        failedCount,
        unmatchedCount,
      });
      throw new Error(this.describeFailure(args.result));
    }
  }

  /**
   * Pairs the two filters into the instances a run covers.
   *
   * With both flags supplied the globbed paths are intersected with the
   * selected templates' own instances, rather than one flag winning: each
   * simply removes candidates from one side.
   */
  private selectInstances(args: {
    configuration: ConformetryConfiguration;
    instanceGlobs: string[] | undefined;
    selectedTemplates: ConformetryGeneratorDefinition[] | undefined;
    workingDirectory: string;
  }): Instance[] {
    const templateInstances = this.findInstances({
      groups: (args.selectedTemplates ?? args.configuration).flatMap(
        (generator) => generator.instances,
      ),
      workingDirectory: args.workingDirectory,
    });

    if (args.instanceGlobs === undefined) {
      return templateInstances;
    }

    const globbedInstances = this.findInstances({
      groups: [{ patterns: args.instanceGlobs }],
      workingDirectory: args.workingDirectory,
    });

    if (args.selectedTemplates === undefined) {
      return globbedInstances;
    }

    const selectedPaths = new Set(
      templateInstances.map((instance) => instance.path),
    );

    return globbedInstances.filter((instance) => {
      return selectedPaths.has(instance.path);
    });
  }

  /**
   * Narrows the run to the selected templates, or leaves it whole.
   *
   * `undefined` means no narrowing, which is a different thing from an empty
   * selection: it is what an absent flag, the `all` sentinel, and a cancelled
   * picker all mean, and it reproduces the run this command made before the
   * flag existed.
   */
  private async selectTemplates(args: {
    configuration: ConformetryConfiguration;
    templateNames: string[] | undefined;
  }): Promise<ConformetryGeneratorDefinition[] | undefined> {
    const selectedNames =
      args.templateNames ??
      (await this.promptForTemplateNames(args.configuration));

    if (
      selectedNames === undefined ||
      selectedNames.includes(ALL_TEMPLATES_SELECTION)
    ) {
      return undefined;
    }

    return selectedNames.map((templateName) => {
      const definition = args.configuration.find((generator) => {
        return generator.name === templateName;
      });

      if (definition === undefined) {
        this.logger.error("🚫 Rejected an unknown template", undefined, {
          template: templateName,
        });
        throw unknownTemplateError({
          availableTemplateNames: args.configuration.map((generator) => {
            return generator.name;
          }),
          templateName,
        });
      }

      return definition;
    });
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

  /** Parses the optional instance glob override. */
  @Option({
    description:
      "Comma-separated glob patterns to validate, overriding the configuration",
    flags: "--instances [globs]",
  })
  public parseInstances(value: string | undefined): string[] | undefined {
    return this.configurationService.parseCommaDelimitedOption(value);
  }

  /** Parses the optional language filter. */
  @Option({
    description: "Comma-separated language names to run",
    flags: "--languages [languages]",
  })
  public parseLanguages(value: string | undefined): string[] | undefined {
    return this.configurationService.parseCommaDelimitedOption(value);
  }

  /**
   * Parses the optional template filter.
   *
   * Comma-delimited like its `--instances` and `--languages` siblings, so all
   * three read the same way on a command line.
   */
  @Option({
    description: `Comma-separated template names to validate, or "${ALL_TEMPLATES_SELECTION}" for every one`,
    flags: "--templates [names]",
  })
  public parseTemplates(value: string | undefined): string[] | undefined {
    return this.configurationService.parseCommaDelimitedOption(value);
  }

  /** Parses the optional run-level conformance threshold. */
  @Option({
    description:
      "Lowest conformance score an instance may have, from 0 to 1. Overridden by a generator's own threshold and by an instance group's",
    flags: "--threshold [ratio]",
  })
  public parseThreshold(value: string | undefined): number | undefined {
    return this.configurationService.parseThresholdOption(value);
  }

  /** Runs validation and reports every difference found. */
  public async run(
    _passedParameters: string[],
    options: ValidateCommandOptions,
  ): Promise<void> {
    this.logger.debug("🔍 Validating conformetry instances", undefined, {
      instanceFilter: options.instances,
    });

    const workingDirectory = process.cwd();
    const configuration =
      await this.configurationService.loadConformetryConfiguration(
        options.config ?? DEFAULT_CONFIGURATION_PATH,
      );
    const selectedTemplates = await this.selectTemplates({
      configuration,
      templateNames: options.templates,
    });
    const instances = this.selectInstances({
      configuration,
      instanceGlobs: options.instances,
      selectedTemplates,
      workingDirectory,
    });

    if (selectedTemplates !== undefined && instances.length === 0) {
      this.reportEmptySelection(selectedTemplates);

      return;
    }

    const result = this.validationService.validate({
      instances,
      ...(options.threshold === undefined
        ? {}
        : { threshold: options.threshold }),
      ...(options.languages === undefined
        ? {}
        : { languageNames: options.languages }),
      templates: this.configurationService.collectTemplates({
        configuration: selectedTemplates ?? configuration,
        workingDirectory,
      }),
    });

    this.reportResult({ result, workingDirectory });
  }
}
