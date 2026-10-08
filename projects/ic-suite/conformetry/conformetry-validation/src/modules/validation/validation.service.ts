import path from "node:path";

import { ConfigurationService } from "@conformetry/configuration";
import { FilesService, LanguagesService } from "@conformetry/languages";
import { Injectable } from "@nestjs/common";

import { RunnerService } from "../runner/runner.service";

import { ValidationDeduplicationService } from "./validation-deduplication.service";
import { ValidationFindingsService } from "./validation-findings.service";
import { ValidationScoringService } from "./validation-scoring.service";

import type {
  InstanceFileResults,
  PlaceholderInference,
  RunValidationArguments,
  RunValidationResult,
} from "./validation.types";
import type { MatchedInstance } from "@conformetry/configuration";
import type { ConformetryLanguageValidator } from "@conformetry/core";

/**
 * Runs a full conformetry validation: match instances to templates, check the
 * files exist, then compare contents language by language.
 *
 * The instances arrive from the caller. This package used to scan the
 * workspace for `project.json` files and infer scope from generator name
 * suffixes, which made a generic package depend on one repository's layout.
 */
@Injectable()
export class ValidationService {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly filesService: FilesService,
    private readonly languagesService: LanguagesService,
    private readonly runnerService: RunnerService,
    private readonly validationDeduplicationService: ValidationDeduplicationService,
    private readonly validationFindingsService: ValidationFindingsService,
    private readonly validationScoringService: ValidationScoringService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Checks one instance's files exist, then compares the documents whose
   * extensions the selected validators claim.
   *
   * File existence comes first because a missing file cannot be compared, and
   * reporting it once is clearer than every language reporting it in turn.
   */
  private compareInstance(args: {
    instance: MatchedInstance;
    validators: ConformetryLanguageValidator[];
  }): InstanceFileResults {
    const [prepared] = this.configurationService.prepareDocuments({
      fileExtensions: this.readClaimedExtensions(args.validators),
      instances: [args.instance],
    });
    const files = this.filesService.checkInstanceFiles({
      instances: [args.instance],
    });
    const languages = args.validators.map((validator) => {
      return this.runnerService.runValidator({
        checkedPaths: [args.instance.instance.path],
        documents: prepared?.documents ?? [],
        validator,
      });
    });

    return {
      fileResults: [
        ...files.fileResults,
        ...languages.flatMap((language) => language.fileResults),
      ],
      instance: args.instance,
      // Existence and content are separate requirements over the same files:
      // a file can be present and still wrong, so neither total subsumes the
      // other and they add.
      totalWeight: languages.reduce((total, language) => {
        return total + language.totalWeight;
      }, files.totalWeight),
    };
  }

  /**
   * Fills in each placeholder nothing supplied from the instance itself.
   *
   * The template was rendered with a random value standing in for each one,
   * and a first comparison captures the text of the instance node aligned with
   * the first template node holding each value. The instance comes back with
   * that text substituted, ready for the ordinary comparison — which is the
   * consistency check, since a later occurrence holding different text is an
   * ordinary difference. `missing` keeps the stand-in of every placeholder
   * nothing revealed. The capture pass runs only when something is unresolved.
   */
  private inferPlaceholders(args: {
    instance: MatchedInstance;
    validators: ConformetryLanguageValidator[];
  }): PlaceholderInference {
    const placeholderValues = Object.entries(
      args.instance.placeholderValues ?? {},
    );

    if (placeholderValues.length === 0) {
      return { instance: args.instance, missing: {} };
    }

    const [prepared] = this.configurationService.prepareDocuments({
      fileExtensions: this.readClaimedExtensions(args.validators),
      instances: [args.instance],
    });
    const captures = this.runnerService.captureDocuments({
      documents: prepared?.documents ?? [],
      validators: args.validators,
    });
    const inferred = Object.fromEntries(
      placeholderValues.flatMap(([name, value]) => {
        const captured = captures[value];

        return captured === undefined ? [] : [[name, captured]];
      }),
    );

    return {
      instance: {
        ...args.instance,
        substitutions: { ...args.instance.substitutions, ...inferred },
      },
      missing: Object.fromEntries(
        placeholderValues.filter(([name]) => !Object.hasOwn(inferred, name)),
      ),
    };
  }

  /** Every extension the selected validators claim. */
  private readClaimedExtensions(
    validators: ConformetryLanguageValidator[],
  ): string[] {
    return validators.flatMap((validator) => {
      return [...validator.descriptor.fileExtensions];
    });
  }

  /** Every distinct file extension the matched templates declare. */
  private readTemplateExtensions(instances: MatchedInstance[]): string[] {
    return [
      ...new Set(
        instances.flatMap((instance) => {
          return instance.template.filePaths.map((filePath) => {
            return path.extname(filePath);
          });
        }),
      ),
    ];
  }

  /** Narrows the resolved validators to the names the caller asked for. */
  private selectValidators(args: {
    languageNames: string[] | undefined;
    validators: ConformetryLanguageValidator[];
  }): ConformetryLanguageValidator[] {
    const { languageNames } = args;

    if (languageNames === undefined || languageNames.length === 0) {
      return args.validators;
    }

    // Bound to a local so the narrowing above survives into the closure,
    // which otherwise needs a fallback for a case that cannot happen.
    return args.validators.filter((validator) => {
      return languageNames.includes(validator.descriptor.name);
    });
  }

  // 🌎 Public Methods

  /**
   * Validates every instance and returns the differences found.
   *
   * Instances that matched no template are reported alongside the content
   * differences rather than skipped, so one report covers both "this file is
   * wrong" and "conformetry cannot tell what this path was generated from".
   *
   * Synchronous, because resolving the languages was the only step that ever
   * waited on anything: they were imported on demand, and now they are
   * injected.
   */
  public validate(args: RunValidationArguments): RunValidationResult {
    const { matched, unmatched } = this.configurationService.matchInstances({
      instances: args.instances,
      templates: args.templates,
    });
    const validators = this.selectValidators({
      languageNames: args.languageNames,
      validators: this.languagesService.resolveValidators({
        extensions: this.readTemplateExtensions(matched),
      }),
    });
    const groups: InstanceFileResults[] = matched.map((instance) => {
      const inference = this.inferPlaceholders({ instance, validators });

      return this.validationFindingsService.reportMissingPlaceholders({
        group: this.compareInstance({
          instance: inference.instance,
          validators,
        }),
        missing: inference.missing,
      });
    });
    const scores = this.validationScoringService.scoreInstances({
      groups,
      runThreshold: args.threshold,
    });
    const fileResults = [
      ...this.validationDeduplicationService.deduplicate(groups),
      ...this.validationFindingsService.buildUnmatchedResults({
        templates: args.templates,
        unmatched,
      }),
    ];

    return {
      checkedPaths: matched.map((instance) => {
        return instance.instance.path;
      }),
      fileResults,
      // An unmatched instance always fails: no template explains it, so there
      // is no threshold it could be held to in the first place.
      ok: unmatched.length === 0 && scores.every((score) => score.ok),
      scores,
      unmatched,
    };
  }
}
