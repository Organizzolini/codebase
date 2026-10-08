import path from "node:path";

import { Injectable } from "@nestjs/common";
import lodash from "lodash";

import {
  DEFAULT_GENERATED_OUTPUT_DIRECTORY,
  GENERATE_COMMAND_TOKEN,
  RESERVED_GENERATOR_OPTION_NAMES,
  TARGET_DIRECTORY_OPTION_KEYS,
} from "./input.constants";

import type { JsonSchemaDefinition } from "../configuration/configuration.types";

/**
 * Parses command-line options into generator inputs.
 *
 * Generator inputs are not declared as CLI flags ahead of time — they come
 * from whichever generator the user selected — so they are scanned out of the
 * raw argument list and matched against the generator's schema.
 */
@Injectable()
export class InputOptionsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Reads one option into the accumulating input map and reports how many
   * argument tokens it consumed, so the caller can advance past its value.
   */
  private collectOneInput(args: {
    argumentIndex: number;
    commandArguments: string[];
    generatorInputs: Record<string, string>;
    schemaPropertyNames: string[];
  }): number {
    const argument = args.commandArguments[args.argumentIndex];

    if (argument?.startsWith("--") !== true) {
      return 1;
    }

    const optionName = this.readOptionName(argument);
    const propertyName = this.resolvePropertyName({
      optionName,
      schemaPropertyNames: args.schemaPropertyNames,
    });
    const optionValue = this.readOptionValue({
      argumentIndex: args.argumentIndex,
      commandArguments: args.commandArguments,
    });

    if (
      propertyName === undefined ||
      optionValue === undefined ||
      RESERVED_GENERATOR_OPTION_NAMES.has(optionName)
    ) {
      return 1;
    }

    args.generatorInputs[propertyName] = optionValue;

    return argument.includes("=") ? 1 : 2;
  }

  /** Reads the option name from `--flag` or `--flag=value`. */
  private readOptionName(argument: string): string {
    return argument.includes("=")
      ? (argument.slice(2).split("=", 1)[0] ?? "")
      : argument.slice(2);
  }

  /**
   * Reads an option's value from either `--flag=value` or `--flag value`.
   *
   * Returns `undefined` when the next token is another flag, so a valueless
   * flag does not swallow the option that follows it.
   */
  private readOptionValue(args: {
    argumentIndex: number;
    commandArguments: string[];
  }): string | undefined {
    const argument = args.commandArguments[args.argumentIndex] ?? "";

    if (argument.includes("=")) {
      return argument.slice(argument.indexOf("=") + 1);
    }

    const nextArgument = args.commandArguments[args.argumentIndex + 1];

    return nextArgument === undefined || nextArgument.startsWith("--")
      ? undefined
      : nextArgument;
  }

  /** Matches an option name to a schema property, in camel or kebab form. */
  private resolvePropertyName(args: {
    optionName: string;
    schemaPropertyNames: string[];
  }): string | undefined {
    return args.schemaPropertyNames.find((candidate) => {
      return (
        args.optionName === candidate ||
        args.optionName === lodash.kebabCase(candidate)
      );
    });
  }

  // 🌎 Public Methods

  /**
   * Scans raw arguments for flags matching the generator's schema.
   *
   * Unknown flags are ignored rather than rejected: the argument list also
   * carries the command's own options, which are handled elsewhere.
   */
  public collectGeneratorInputs(args: {
    rawArguments: string[];
    schema: JsonSchemaDefinition;
  }): Record<string, string> {
    const commandArguments =
      args.rawArguments[0] === GENERATE_COMMAND_TOKEN
        ? args.rawArguments.slice(1)
        : args.rawArguments;
    const schemaPropertyNames = Object.keys(args.schema.properties ?? {});
    const generatorInputs: Record<string, string> = {};
    let argumentIndex = 0;

    while (argumentIndex < commandArguments.length) {
      argumentIndex += this.collectOneInput({
        argumentIndex,
        commandArguments,
        generatorInputs,
        schemaPropertyNames,
      });
    }

    return generatorInputs;
  }

  /** Coerces mixed-typed runtime options into string inputs. */
  public normalizeRuntimeOptions(
    options: Record<string, unknown>,
  ): Record<string, string | undefined> {
    const normalized: Record<string, string | undefined> = {};

    for (const [key, value] of Object.entries(options)) {
      if (value === undefined) {
        normalized[key] = undefined;
      } else if (typeof value === "string") {
        normalized[key] = value;
      } else if (typeof value === "number" || typeof value === "boolean") {
        normalized[key] = `${value}`;
      } else {
        normalized[key] = JSON.stringify(value);
      }
    }

    return normalized;
  }

  /**
   * Resolves where generated files should land: an explicit output option, a
   * resolved project root, or a directory named after the generator.
   */
  public resolveTargetDirectoryPath(args: {
    defaultGeneratedOutputDirectory?: string;
    generatorName: string;
    options: Record<string, unknown>;
    resolveProjectRootPath?: (projectName: string) => string | undefined;
  }): string {
    for (const optionKey of TARGET_DIRECTORY_OPTION_KEYS) {
      const optionValue = args.options[optionKey];

      if (typeof optionValue === "string") {
        return optionValue;
      }
    }

    const projectName = args.options["projectName"] ?? args.options["project"];

    if (typeof projectName === "string") {
      const projectRootPath = args.resolveProjectRootPath?.(projectName);

      if (typeof projectRootPath === "string") {
        return projectRootPath;
      }
    }

    return path.join(
      args.defaultGeneratedOutputDirectory ??
        DEFAULT_GENERATED_OUTPUT_DIRECTORY,
      args.generatorName,
    );
  }
}
