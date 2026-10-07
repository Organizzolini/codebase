import { capturePlaceholderValues } from "@conformetry/configuration";
import { Injectable } from "@nestjs/common";

import { ScoringService } from "../scoring/scoring.service";

import type {
  CompareJsonArguments,
  JsonComparison,
  JsonComparisonLanguage,
  JsonPathSegment,
  JsonValue,
} from "./json.types";
import type { ConformetryDifference } from "@conformetry/core";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Structurally compares two JSON documents.
 *
 * The template is treated as a **subset** requirement, not an exact match: the
 * instance may add keys and array entries freely, but every key and value the
 * template declares must be present. That is what makes a generated file
 * editable after generation without immediately failing validation.
 *
 * Exported from this module so the Jupyter module can reuse it for
 * notebooks, which are JSON documents, rather than duplicating the walk.
 *
 * The walk also counts what it asked for: every template node is one
 * requirement, and a key with no counterpart costs the whole subtree beneath
 * it, so dropping an object scores worse than dropping one of its scalars.
 */
@Injectable()
/* v8 ignore stop */
export class JsonComparisonService {
  // 🏗 Dependency Injection

  constructor(private readonly scoringService: ScoringService) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Builds one structural error at a JSON path. */
  private buildError(args: {
    actual?: string;
    expected?: string;
    fix: string;
    language: JsonComparisonLanguage;
    message: string;
    pathValue: string;
    weight: number;
  }): ConformetryDifference {
    return {
      ...(args.actual === undefined ? {} : { actual: args.actual }),
      differenceType: "code",
      ...(args.expected === undefined ? {} : { expected: args.expected }),
      fix: args.fix,
      instancePath: args.pathValue,
      language: args.language,
      message: args.message,
      templatePath: args.pathValue,
      weight: args.weight,
    };
  }

  /**
   * Captures what a template string's placeholder values stand for in an
   * instance value, or `undefined` when the two do not match as a pattern.
   */
  private captureString(args: {
    instanceValue: JsonValue | undefined;
    templateValue: JsonValue;
  }): Record<string, string> | undefined {
    if (
      typeof args.templateValue !== "string" ||
      typeof args.instanceValue !== "string"
    ) {
      return undefined;
    }

    return capturePlaceholderValues({
      instanceText: args.instanceValue,
      templateText: args.templateValue,
    });
  }

  /** Merges sibling comparisons into one, keeping the first captures. */
  private combine(comparisons: JsonComparison[]): JsonComparison {
    return comparisons.reduce<JsonComparison>(
      (combined, comparison) => {
        return {
          captures: { ...comparison.captures, ...combined.captures },
          differences: [...combined.differences, ...comparison.differences],
          totalWeight: combined.totalWeight + comparison.totalWeight,
        };
      },
      { differences: [], totalWeight: 0 },
    );
  }

  /** Matches one required array entry against the instance array. */
  private compareArrayItem(args: {
    instanceArray: JsonValue[];
    language: JsonComparisonLanguage;
    pathSegments: JsonPathSegment[];
    templateItem: JsonValue;
  }): JsonComparison {
    const pathValue = this.formatPath(args.pathSegments);
    const weight = this.countNodes(args.templateItem);

    if (this.isJsonPrimitive(args.templateItem)) {
      const { templateItem } = args;
      const captures = args.instanceArray.includes(templateItem)
        ? {}
        : args.instanceArray
            .map((instanceValue) => {
              return this.captureString({
                instanceValue,
                templateValue: templateItem,
              });
            })
            .find((captured) => captured !== undefined);

      return captures === undefined
        ? {
            differences: [
              this.buildError({
                expected: JSON.stringify(args.templateItem),
                fix: `Add ${JSON.stringify(args.templateItem)} to the array at "${pathValue}".`,
                language: args.language,
                message: `Missing required array value ${JSON.stringify(args.templateItem)} at "${pathValue}"`,
                pathValue,
                weight,
              }),
            ],
            totalWeight: weight,
          }
        : { captures, differences: [], totalWeight: weight };
    }

    if (args.instanceArray.length === 0) {
      return {
        differences: [
          this.buildError({
            fix: `Add the required entry to the array at "${pathValue}".`,
            language: args.language,
            message: `Missing required array structure at "${pathValue}"`,
            pathValue,
            weight,
          }),
        ],
        totalWeight: weight,
      };
    }

    return this.pickClosestMatch(
      args.instanceArray.map((instanceItem, index) => {
        return this.compare({
          instanceValue: instanceItem,
          language: args.language,
          pathSegments: [...args.pathSegments, index],
          templateValue: args.templateItem,
        });
      }),
    );
  }

  /**
   * Compares two arrays.
   *
   * Required scalars must appear somewhere in the instance array, order
   * independent. For a required object, the instance entry that produces the
   * fewest differences is taken as the intended match — an array entry has no key, so
   * there is nothing better to match on.
   */
  private compareArrays(args: {
    instanceArray: JsonValue[];
    language: JsonComparisonLanguage;
    pathSegments: JsonPathSegment[];
    templateArray: JsonValue[];
  }): JsonComparison {
    return this.combine(
      args.templateArray.map((templateItem) => {
        return this.compareArrayItem({ ...args, templateItem });
      }),
    );
  }

  /** Compares two objects, requiring every template key to be present. */
  private compareObjects(args: {
    instanceObject: Record<string, JsonValue>;
    language: JsonComparisonLanguage;
    pathSegments: JsonPathSegment[];
    templateObject: Record<string, JsonValue>;
  }): JsonComparison {
    // Entries rather than keys: the value comes back typed, so neither side
    // needs a null fallback that could never be taken.
    return this.combine(
      Object.entries(args.templateObject).map(([key, templateValue]) => {
        const pathSegments = [...args.pathSegments, key];
        const pathValue = this.formatPath(pathSegments);
        const instanceValue = args.instanceObject[key];

        if (instanceValue === undefined) {
          const weight = this.countNodes(templateValue);

          return {
            differences: [
              this.buildError({
                expected: JSON.stringify(templateValue),
                fix: `Add the key "${pathValue}" to the instance document.`,
                language: args.language,
                message: `Missing required key "${pathValue}"`,
                pathValue,
                weight,
              }),
            ],
            totalWeight: weight,
          };
        }

        return this.compare({
          instanceValue,
          language: args.language,
          pathSegments,
          templateValue,
        });
      }),
    );
  }

  /**
   * Adds the container's own requirement to what its members contributed, so a
   * matched object weighs exactly what `countNodes` would have charged for it
   * had it been missing.
   */
  private countContainer(comparison: JsonComparison): JsonComparison {
    return { ...comparison, totalWeight: comparison.totalWeight + 1 };
  }

  /** Counts a JSON value and every value nested inside it. */
  private countNodes(value: JsonValue): number {
    if (Array.isArray(value)) {
      return value.reduce<number>((total, item) => {
        return total + this.countNodes(item);
      }, 1);
    }

    if (this.isJsonObject(value)) {
      return Object.values(value).reduce<number>((total, nested) => {
        return total + this.countNodes(nested);
      }, 1);
    }

    return 1;
  }

  /** Renders a path as `scripts.build[0]` for error messages. */
  private formatPath(pathSegments: JsonPathSegment[]): string {
    return pathSegments.reduce<string>((pathValue, segment) => {
      if (typeof segment === "number") {
        return `${pathValue}[${String(segment)}]`;
      }

      return pathValue === "" ? segment : `${pathValue}.${segment}`;
    }, "");
  }

  /** Returns whether a value is a plain JSON object. */
  private isJsonObject(value: JsonValue): value is Record<string, JsonValue> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  /** Returns whether a value is a JSON scalar. */
  private isJsonPrimitive(
    value: JsonValue,
  ): value is boolean | null | number | string {
    return value === null || typeof value !== "object";
  }

  /**
   * Picks the candidate comparison that left the least of the template
   * unaccounted for.
   *
   * Weighed by failed weight rather than error count: one finding standing in
   * for a whole missing object is a worse match than two missing scalars.
   */
  private pickClosestMatch(candidates: JsonComparison[]): JsonComparison {
    return candidates.reduce((best, candidate) => {
      return this.scoringService.sumWeights(candidate.differences) <
        this.scoringService.sumWeights(best.differences)
        ? candidate
        : best;
    });
  }

  // 🌎 Public Methods

  /**
   * Compares a template value against an instance value, returning every way
   * the instance fails to contain what the template requires.
   */
  public compare(args: CompareJsonArguments): JsonComparison {
    const pathSegments = args.pathSegments ?? [];

    if (
      Array.isArray(args.templateValue) &&
      Array.isArray(args.instanceValue)
    ) {
      return this.countContainer(
        this.compareArrays({
          instanceArray: args.instanceValue,
          language: args.language,
          pathSegments,
          templateArray: args.templateValue,
        }),
      );
    }

    if (
      this.isJsonObject(args.templateValue) &&
      this.isJsonObject(args.instanceValue)
    ) {
      return this.countContainer(
        this.compareObjects({
          instanceObject: args.instanceValue,
          language: args.language,
          pathSegments,
          templateObject: args.templateValue,
        }),
      );
    }

    const weight = this.countNodes(args.templateValue);

    const captures =
      args.templateValue === args.instanceValue ? {} : this.captureString(args);

    if (captures !== undefined) {
      return { captures, differences: [], totalWeight: weight };
    }

    const pathValue = this.formatPath(pathSegments);

    return {
      differences: [
        this.buildError({
          actual: JSON.stringify(args.instanceValue),
          expected: JSON.stringify(args.templateValue),
          fix: `Set "${pathValue}" to ${JSON.stringify(args.templateValue)}.`,
          language: args.language,
          message: `Expected ${JSON.stringify(args.templateValue)} at "${pathValue}" but found ${JSON.stringify(args.instanceValue)}`,
          pathValue,
          weight,
        }),
      ],
      totalWeight: weight,
    };
  }
}
