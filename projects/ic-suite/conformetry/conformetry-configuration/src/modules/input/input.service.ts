import { Injectable } from "@nestjs/common";

import { InputOptionsService } from "./input-options.service";
import { InputPromptingService } from "./input-prompting.service";
import { InputSchemaService } from "./input-schema.service";
import { missingInputError } from "./input.constants";

import type {
  ResolveGeneratorInputsArguments,
  ResolveInputsFromValuesArguments,
  SchemaInput,
} from "./input.types";

/**
 * Resolves generator inputs from the command line, asking for what is missing.
 *
 * Nobody passes a "may I prompt" boolean any more. It used to be threaded
 * through every method here from a `--no-interactive` flag, which put the one
 * decision that can hang the process in the hands of each caller in turn;
 * `InputPromptingService` owns it now and refuses at the prompt itself.
 */
@Injectable()
export class InputService {
  // 🏗 Dependency Injection

  constructor(
    private readonly inputOptionsService: InputOptionsService,
    private readonly inputPromptingService: InputPromptingService,
    private readonly inputSchemaService: InputSchemaService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Validates a value the caller already had, throwing if it is invalid. */
  private acceptProvidedValue(args: {
    input: SchemaInput;
    value: string;
  }): string {
    const validation = this.inputSchemaService.validateValue(args);

    if (validation !== true) {
      throw new Error(validation);
    }

    return args.value;
  }

  /** Walks a schema, taking each value from the resolver or a prompt. */
  private async resolveInputs(args: {
    schema: ResolveGeneratorInputsArguments["schema"];
    valueResolver: (inputName: string) => string | undefined;
  }): Promise<Record<string, string>> {
    const resolvedInputs: Record<string, string> = {};

    for (const inputName of this.inputSchemaService.readPropertyNames(
      args.schema,
    )) {
      const input = this.inputSchemaService.describeInput({
        inputName,
        schema: args.schema,
      });
      const existingValue = args.valueResolver(inputName);

      if (existingValue !== undefined) {
        resolvedInputs[inputName] = this.acceptProvidedValue({
          input,
          value: existingValue,
        });
        continue;
      }

      const promptedValue = await this.resolveMissingValue(input);

      if (promptedValue !== undefined && promptedValue.trim() !== "") {
        resolvedInputs[inputName] = promptedValue;
      }
    }

    return resolvedInputs;
  }

  /**
   * Obtains one missing value by prompting.
   *
   * With nobody at a terminal the two kinds of input part ways: an optional
   * one is left out, and a required one is refused. Prompting anyway is what
   * used to hang the process, and refusing an optional input would fail runs
   * that never needed the value at all.
   */
  private async resolveMissingValue(
    input: SchemaInput,
  ): Promise<string | undefined> {
    if (!this.inputPromptingService.isAtTerminal()) {
      if (input.isRequired) {
        throw missingInputError(input.inputName);
      }

      return undefined;
    }

    const value = await this.inputPromptingService.promptForInput(input);
    const validation = this.inputSchemaService.validateValue({ input, value });

    if (validation !== true) {
      throw new Error(validation);
    }

    return value;
  }

  // 🌎 Public Methods

  /** Splits a comma-delimited filter option into its values. */
  public parseCommaDelimitedOption(
    value: string | undefined,
  ): string[] | undefined {
    if (value === undefined) {
      return undefined;
    }

    const values = value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    return values.length > 0 ? values : undefined;
  }

  /** Trims an optional string option, treating blank as absent. */
  public parseOptionalOption(value: string | undefined): string | undefined {
    const trimmed = value?.trim();

    return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
  }

  /** Trims a required string option, rejecting blank values. */
  public parseRequiredOption(args: {
    optionName: string;
    value: string;
  }): string {
    const trimmed = args.value.trim();

    if (trimmed.length === 0) {
      throw new Error(`${args.optionName} must not be empty`);
    }

    return trimmed;
  }

  /**
   * Parses a threshold option as a ratio from 0 to 1.
   *
   * Rejected loudly rather than clamped: `--threshold 90` is someone meaning
   * 90%, and silently reading it as "always passes" would turn a typo into a
   * validation run that can never fail.
   */
  public parseThresholdOption(value: string | undefined): number | undefined {
    const trimmed = this.parseOptionalOption(value);

    if (trimmed === undefined) {
      return undefined;
    }

    const threshold = Number(trimmed);

    if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
      throw new Error(
        `Invalid --threshold ${trimmed}: expected a ratio between 0 and 1, such as 0.9.`,
      );
    }

    return threshold;
  }

  /** Resolves generator inputs from raw command-line arguments. */
  public async resolveGeneratorInputs(
    args: ResolveGeneratorInputsArguments,
  ): Promise<Record<string, string>> {
    const collectedInputs = this.inputOptionsService.collectGeneratorInputs({
      rawArguments: args.rawArguments,
      schema: args.schema,
    });

    return this.resolveInputs({
      schema: args.schema,
      valueResolver: (inputName) => collectedInputs[inputName],
    });
  }

  /** Resolves inputs from values the caller already parsed. */
  public async resolveInputsFromValues(
    args: ResolveInputsFromValuesArguments,
  ): Promise<Record<string, string>> {
    return this.resolveInputs({
      schema: args.schema,
      valueResolver: (inputName) => args.providedInputs[inputName],
    });
  }
}
