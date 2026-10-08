import { Injectable } from "@nestjs/common";

import { FINDING_KEY_SEPARATOR } from "./validation.constants";

import type { InstanceFileResults } from "./validation.types";
import type { MatchedInstance } from "@conformetry/configuration";
import type { ValidationFileResult } from "@conformetry/core";

/**
 * Collapses the findings of overlapping instances into one report.
 *
 * One file is usually covered by several instances — `logger.service.ts` is
 * reached by the project glob, the module glob, and the service-file glob —
 * and each of those matches a different template. Reporting all three would
 * print the same defect three times, phrased against templates of wildly
 * different size.
 */
@Injectable()
export class ValidationDeduplicationService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Orders two instances by template size, then template name.
   *
   * Smallest wins, because the smallest template that still explains the file
   * is the narrowest thing the reader has to fix: `nestjs-service-file` says
   * "this service file is wrong", `nestjs-service-project` says "this project
   * of eighteen files is wrong" about the same line.
   */
  private compareInstances(
    left: MatchedInstance,
    right: MatchedInstance,
  ): number {
    if (left.template.filePaths.length !== right.template.filePaths.length) {
      return left.template.filePaths.length - right.template.filePaths.length;
    }

    return left.template.name.localeCompare(right.template.name);
  }

  /** Keys a finding by the instance and template file pair it came from. */
  private resolveFindingKey(fileResult: ValidationFileResult): string {
    return [fileResult.instanceFilePath, fileResult.templateFilePath].join(
      FINDING_KEY_SEPARATOR,
    );
  }

  /** Picks, for each instance file, the group whose template is smallest. */
  private selectOwners(
    groups: InstanceFileResults[],
  ): Map<string, MatchedInstance> {
    const owners = new Map<string, MatchedInstance>();

    for (const group of groups) {
      for (const fileResult of group.fileResults) {
        const owner = owners.get(fileResult.instanceFilePath);

        if (
          owner === undefined ||
          this.compareInstances(group.instance, owner) < 0
        ) {
          owners.set(fileResult.instanceFilePath, group.instance);
        }
      }
    }

    return owners;
  }

  // 🌎 Public Methods

  /**
   * Returns one finding per instance file, taken from the smallest template
   * that reported it, with duplicate instance/template pairs collapsed.
   *
   * Known property, not a bug: a file is reported against exactly one
   * template, so a requirement unique to a larger template goes unreported for
   * files a smaller template also covers. That is acceptable while the
   * overlapping templates share their file contents, and is the price of not
   * printing the same defect three times.
   */
  public deduplicate(groups: InstanceFileResults[]): ValidationFileResult[] {
    const owners = this.selectOwners(groups);
    const seenKeys = new Set<string>();

    return groups.flatMap((group) => {
      return group.fileResults.filter((fileResult) => {
        if (owners.get(fileResult.instanceFilePath) !== group.instance) {
          return false;
        }

        const key = this.resolveFindingKey(fileResult);

        if (seenKeys.has(key)) {
          return false;
        }

        seenKeys.add(key);

        return true;
      });
    });
  }
}
