import { Injectable } from "@nestjs/common";

import type { JsonSchemaDefinition } from "../configuration/configuration.types";
import type { SchemaInput } from "./input.types";

/**
 * Reads and enforces the JSON Schema fragments that describe generator inputs.
 *
 * Every accessor tolerates a malformed or absent schema: a generator with no
 * declared parameters should still run, and an author's typo should not crash
 * the CLI before it can report anything useful.
 */
@Injectable()
export class InputSchemaService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Reads one property off a schema fragment when it is an object. */
  private readSchemaProperty(propertySchema: unknown, key: string): unknown {
    if (typeof propertySchema !== "object" || propertySchema === null) {
      return undefined;
    }

    const entry = Object.entries(propertySchema).find(([entryKey]) => {
      return entryKey === key;
    });

    return entry?.[1];
  }

  /** Validates a value against a schema `enum`, when one is declared. */
  private validateEnum(args: {
    input: SchemaInput;
    value: string;
  }): string | true {
    const enumValues = this.readEnumValues(args.input.propertySchema);

    if (enumValues.length === 0 || enumValues.includes(args.value)) {
      return true;
    }

    return `${args.input.inputName} must be one of: ${enumValues.join(", ")}`;
  }

  /** Validates a value against `minLength` and `maxLength`. */
  private validateLength(args: {
    input: SchemaInput;
    value: string;
  }): string | true {
    const minimumLength = this.readSchemaProperty(
      args.input.propertySchema,
      "minLength",
    );

    if (
      typeof minimumLength === "number" &&
      args.value.length < minimumLength
    ) {
      return `${args.input.inputName} must be at least ${String(minimumLength)} characters`;
    }

    const maximumLength = this.readSchemaProperty(
      args.input.propertySchema,
      "maxLength",
    );

    if (
      typeof maximumLength === "number" &&
      args.value.length > maximumLength
    ) {
      return `${args.input.inputName} must be at most ${String(maximumLength)} characters`;
    }

    return true;
  }

  /** Validates a value against a schema `pattern`. */
  private validatePattern(args: {
    input: SchemaInput;
    value: string;
  }): string | true {
    const pattern = this.readSchemaProperty(
      args.input.propertySchema,
      "pattern",
    );

    if (typeof pattern !== "string") {
      return true;
    }

    return new RegExp(pattern, "u").test(args.value)
      ? true
      : `${args.input.inputName} does not match pattern ${pattern}`;
  }

  // 🌎 Public Methods

  /** Describes one input, resolving its schema fragment and required flag. */
  public describeInput(args: {
    inputName: string;
    schema: JsonSchemaDefinition;
  }): SchemaInput {
    const declaredRequired: unknown = args.schema["required"];
    const requiredNames: unknown[] = Array.isArray(declaredRequired)
      ? declaredRequired
      : [];

    return {
      inputName: args.inputName,
      isRequired: requiredNames.includes(args.inputName),
      propertySchema: args.schema.properties?.[args.inputName],
    };
  }

  /** Reads the string members of a schema `enum`. */
  public readEnumValues(propertySchema: unknown): string[] {
    const enumValues = this.readSchemaProperty(propertySchema, "enum");

    if (!Array.isArray(enumValues)) {
      return [];
    }

    const candidates: unknown[] = enumValues;

    return candidates.filter((value) => typeof value === "string");
  }

  /** Reads a schema `description`, falling back to a generic prompt. */
  public readPromptMessage(input: SchemaInput): string {
    const description = this.readSchemaProperty(
      input.propertySchema,
      "description",
    );

    return typeof description === "string" && description.trim().length > 0
      ? description
      : `Enter ${input.inputName}`;
  }

  /** Lists the input names a schema declares. */
  public readPropertyNames(schema: JsonSchemaDefinition): string[] {
    return Object.keys(schema.properties ?? {});
  }

  /**
   * Validates a value, returning `true` or the reason it failed.
   *
   * An empty value is only an error when the input is required, so optional
   * inputs can be skipped by pressing enter at a prompt.
   */
  public validateValue(args: {
    input: SchemaInput;
    value: unknown;
  }): string | true {
    if (typeof args.value !== "string" || args.value.trim().length === 0) {
      return args.input.isRequired
        ? `${args.input.inputName} is required`
        : true;
    }

    const value = args.value;
    const enumResult = this.validateEnum({ input: args.input, value });

    if (enumResult !== true) {
      return enumResult;
    }

    const lengthResult = this.validateLength({ input: args.input, value });

    return lengthResult === true
      ? this.validatePattern({ input: args.input, value })
      : lengthResult;
  }
}
