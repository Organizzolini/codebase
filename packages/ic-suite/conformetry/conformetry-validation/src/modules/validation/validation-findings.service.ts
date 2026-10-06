import path from "node:path";

import { Injectable } from "@nestjs/common";

import type { InstanceFileResults } from "./validation.types";
import type {
  TemplateDefinition,
  UnmatchedInstance,
  UnmatchedReason,
} from "@conformetry/configuration";
import type { ValidationFileResult } from "@conformetry/core";

/**
 * Turns instances that matched no template into ordinary findings.
 *
 * Silence would be the wrong answer here. A glob is the author asserting that
 * a path holds generated code, so a path matching nothing means either the
 * instance drifted past recognition or the glob is wrong — both worth saying
 * out loud, and both invisible if unmatched instances were merely skipped.
 */
@Injectable()
export class ValidationFindingsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Describes why an instance could not be attributed to one template. */
  private describeReason(args: {
    reason: UnmatchedReason;
    tiedTemplateNames: string[];
  }): { fix: string; message: string } {
    if (args.reason === "ambiguous") {
      const names = args.tiedTemplateNames.join(", ");

      return {
        fix: `Give the templates ${names} distinguishing files, or narrow the instance glob so only one applies.`,
        message: `Ambiguous instance: matches ${names} equally well`,
      };
    }

    return {
      fix: "Regenerate the instance from its template, or remove it from the instance globs if it is not generated code.",
      message: "Unmatched instance: no template explains this path",
    };
  }

  /**
   * The directory the templates share, used as the "template" line of an
   * unmatched finding — there is no single template to point at, and the set
   * they were drawn from is the most useful thing to name.
   */
  private resolveTemplatesRootPath(templates: TemplateDefinition[]): string {
    const parentPaths = templates.map((template) => {
      return path.dirname(template.directoryPath);
    });

    return parentPaths.toSorted()[0] ?? "";
  }

  // 🌎 Public Methods

  /** Builds one finding per unmatched instance, in instance order. */
  public buildUnmatchedResults(args: {
    templates: TemplateDefinition[];
    unmatched: UnmatchedInstance[];
  }): ValidationFileResult[] {
    const templatesRootPath = this.resolveTemplatesRootPath(args.templates);

    return args.unmatched.map((instance) => {
      const instancePath = path.join(
        instance.instance.path,
        instance.instance.nameStem,
      );

      return {
        differences: [
          {
            differenceType: "instance" as const,
            ...this.describeReason({
              reason: instance.reason,
              tiedTemplateNames: instance.tiedTemplateNames,
            }),
          },
        ],
        filename: instance.instance.nameStem,
        instanceFilePath: instancePath,
        templateFilePath: templatesRootPath,
        // An unmatched instance is never scored — no template means no
        // requirements to weigh it against — so this total is never a
        // denominator. It fails the run on its own, before any threshold.
        totalWeight: 0,
      };
    });
  }

  /**
   * Adds one finding per placeholder nothing in the instance revealed.
   *
   * `missing` maps each such placeholder to the random value it was still
   * rendered with. Differences quoting that value are dropped: they restate
   * the same gap in terms of a value nobody wrote, and the finding names it.
   */
  public reportMissingPlaceholders(args: {
    group: InstanceFileResults;
    missing: Record<string, string>;
  }): InstanceFileResults {
    const entries = Object.entries(args.missing);

    if (entries.length === 0) {
      return args.group;
    }

    const { instance } = args.group.instance;
    const fileResults = args.group.fileResults
      .map((fileResult) => {
        return {
          ...fileResult,
          differences: fileResult.differences.filter((difference) => {
            const text = JSON.stringify(difference);

            return !entries.some(([, value]) => text.includes(value));
          }),
        };
      })
      .filter((fileResult) => fileResult.differences.length > 0);

    return {
      ...args.group,
      fileResults: [
        {
          differences: entries.map(([name]) => {
            return {
              differenceType: "placeholder" as const,
              fix: `Supply ${name} in the instance group's substitutions, or restore the template text that uses {{${name}}} in the instance.`,
              message: `Could not infer {{${name}}}: no instance node aligned with the template text that uses it`,
              weight: 1,
            };
          }),
          filename: instance.nameStem,
          instanceFilePath: path.join(instance.path, instance.nameStem),
          templateFilePath: args.group.instance.template.directoryPath,
          totalWeight: entries.length,
        },
        ...fileResults,
      ],
      // Each placeholder nothing revealed is one requirement, unmet, so the
      // score says the instance could not be checked rather than reading 100%.
      totalWeight: args.group.totalWeight + entries.length,
    };
  }
}
