import fs from "node:fs";
import path from "node:path";

import { ConfigurationService } from "@conformetry/configuration";
import { Injectable } from "@nestjs/common";

import { DifferencesService } from "../differences/differences.service";

import type {
  CheckInstanceFilesArguments,
  FilesCheckResult,
  WeighedConformetryDifference,
} from "./files.types";
import type { InstanceFile } from "@conformetry/configuration";
import type { ValidationFileResult } from "@conformetry/core";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Checks that every file a project's template declares actually exists.
 *
 * This runs before any language validator, and is the only check that covers
 * *every* template file regardless of extension. A language validator only
 * sees documents whose extension it claims, so files such as `.gitignore`,
 * `.env.default`, and `pyproject.toml` were previously never checked at all —
 * a project could delete them and still validate clean.
 */
@Injectable()
/* v8 ignore stop */
export class FilesService {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly errorsService: DifferencesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Reports a path as a missing directory when the template entry lives under
   * a directory that does not exist, and as a missing file otherwise.
   *
   * Reporting the absent directory once is more useful than reporting each of
   * the twenty files inside it.
   */
  private buildMissingDifference(args: {
    expectedFileCount: number;
    instanceFilePath: string;
    templateFilePath: string;
  }): WeighedConformetryDifference {
    const parentDirectoryPath = path.dirname(args.instanceFilePath);

    if (fs.existsSync(parentDirectoryPath)) {
      return {
        ...this.errorsService.buildMissingFileDifference(args),
        weight: 1,
      };
    }

    return {
      ...this.errorsService.buildMissingDirectoryDifference({
        instanceDirectoryPath: parentDirectoryPath,
        templateDirectoryPath: path.dirname(args.templateFilePath),
      }),
      // One finding stands in for every file the absent directory should have
      // held, so it costs what reporting them individually would have.
      weight: args.expectedFileCount,
    };
  }

  /** Counts how many declared files one directory should hold. */
  private countExpectedFiles(args: {
    expectedFiles: InstanceFile[];
    parentDirectoryPath: string;
  }): number {
    return args.expectedFiles.filter((expectedFile) => {
      return (
        path.dirname(expectedFile.instanceFilePath) === args.parentDirectoryPath
      );
    }).length;
  }

  /**
   * Reports every file a matched instance's template requires but the instance
   * lacks.
   *
   * Missing directories are collapsed to one finding each, so deleting a whole
   * module reports the directory rather than each file within it.
   */
  public checkInstanceFiles(
    args: CheckInstanceFilesArguments,
  ): FilesCheckResult {
    const expectedFiles = this.configurationService.resolveInstanceFiles(
      args.instances,
    );
    const reportedDirectories = new Set<string>();
    const fileResults: ValidationFileResult[] = [];

    for (const expectedFile of expectedFiles) {
      if (fs.existsSync(expectedFile.instanceFilePath)) {
        continue;
      }

      const parentDirectoryPath = path.dirname(expectedFile.instanceFilePath);

      if (reportedDirectories.has(parentDirectoryPath)) {
        continue;
      }

      const error = this.buildMissingDifference({
        expectedFileCount: this.countExpectedFiles({
          expectedFiles,
          parentDirectoryPath,
        }),
        ...expectedFile,
      });

      if (error.differenceType === "directory") {
        reportedDirectories.add(parentDirectoryPath);
      }

      fileResults.push({
        differences: [error],
        filename: path.basename(expectedFile.instanceFilePath),
        instanceFilePath: expectedFile.instanceFilePath,
        templateFilePath: expectedFile.templateFilePath,
        totalWeight: error.weight,
      });
    }

    // Every declared file is one requirement, present ones included.
    return { fileResults, totalWeight: expectedFiles.length };
  }
}
