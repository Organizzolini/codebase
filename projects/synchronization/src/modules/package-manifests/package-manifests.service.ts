import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import {
  BUGS_URL,
  GITHUB_TREE_BASE_URL,
  PACKAGE_MANIFEST_SCHEMA,
  PUBLISHABLE_PACKAGE_PROJECTS,
  REPOSITORY_URL,
  ROOT_PACKAGE_JSON_PATH,
  ROOT_PACKAGE_JSON_SCHEMA,
} from "./package-manifests.constants";

import type {
  DerivedManifestMetadata,
  PackageManifest,
  PackageManifestCheckResult,
  PackageManifestsSummary,
  RootPackageManifest,
} from "./package-manifests.types";

/**
 * Service that reconciles mechanically derivable package manifest metadata
 * across the 28 publishable packages.
 */
@Injectable()
export class PackageManifestsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Compares a bugs object field against expected. */
  private compareBugsField(
    actual: PackageManifest["bugs"],
    expected: DerivedManifestMetadata["bugs"],
  ): string | undefined {
    if (actual?.url !== expected.url) {
      return `bugs.url: expected "${expected.url}", received "${actual?.url ?? "undefined"}"`;
    }

    return undefined;
  }

  /** Compares a repository object field against expected. */
  private compareRepositoryField(
    actual: PackageManifest["repository"],
    expected: DerivedManifestMetadata["repository"],
  ): string | undefined {
    const isMatched =
      actual?.directory === expected.directory &&
      actual.type === expected.type &&
      actual.url === expected.url;

    if (!isMatched) {
      return `repository: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual ?? "undefined")}`;
    }

    return undefined;
  }

  /** Compares an optional string field against expected. */
  private compareStringField(
    actual: string | undefined,
    expected: string,
    fieldName: string,
  ): string | undefined {
    if (actual !== expected) {
      return `${fieldName}: expected "${expected}", received "${actual ?? "undefined"}"`;
    }

    return undefined;
  }

  /** Sorts an object's keys alphabetically, ignoring case. */
  private sortKeys(object: Record<string, unknown>): Record<string, unknown> {
    const sortedKeys: string[] = Object.keys(object).toSorted(
      (leftKey: string, rightKey: string) =>
        leftKey.toLowerCase().localeCompare(rightKey.toLowerCase()),
    );
    const result: Record<string, unknown> = {};

    for (const key of sortedKeys) {
      result[key] = object[key];
    }

    return result;
  }

  // 🌎 Public Methods

  /** Checks every publishable package against its expected derived metadata. */
  public checkAll(workspaceRoot: string): PackageManifestsSummary {
    const rootManifest = this.readRootManifest(workspaceRoot);
    const results = PUBLISHABLE_PACKAGE_PROJECTS.map((projectPath) => {
      return this.checkPackageManifest({
        projectPath,
        rootManifest,
        workspaceRoot,
      });
    });

    const failedProjects = results.filter((result) => !result.isSynchronized);
    const succeededProjects = results.filter((result) => result.isSynchronized);

    return {
      checkedCount: results.length,
      failedProjects,
      isSynchronized: failedProjects.length === 0,
      succeededProjects,
    };
  }

  /**
   * Checks whether a package manifest has matching derived metadata
   * and non-empty description and keywords fields.
   */
  public checkPackageManifest(options: {
    projectPath: string;
    rootManifest: RootPackageManifest;
    workspaceRoot: string;
  }): PackageManifestCheckResult {
    const { projectPath, rootManifest, workspaceRoot } = options;
    const manifest = this.readPackageManifest({ projectPath, workspaceRoot });
    const expected = this.deriveMetadata({ projectPath, rootManifest });

    const checks = [
      this.compareStringField(manifest.author, expected.author, "author"),
      this.compareStringField(manifest.license, expected.license, "license"),
      this.compareStringField(manifest.homepage, expected.homepage, "homepage"),
      this.compareBugsField(manifest.bugs, expected.bugs),
      this.compareRepositoryField(manifest.repository, expected.repository),
    ];

    const differences = checks.filter(
      (difference): difference is string => difference !== undefined,
    );

    return {
      differences,
      isSynchronized: differences.length === 0,
      packageName: manifest.name,
      projectPath,
    };
  }

  /**
   * Derives the expected metadata for a package manifest given its project path
   * and the workspace root manifest.
   */
  public deriveMetadata(options: {
    projectPath: string;
    rootManifest: RootPackageManifest;
  }): DerivedManifestMetadata {
    const { projectPath, rootManifest } = options;

    return {
      author: rootManifest.author,
      bugs: {
        url: BUGS_URL,
      },
      homepage: `${GITHUB_TREE_BASE_URL}/${projectPath}#readme`,
      license: rootManifest.license,
      repository: {
        directory: projectPath,
        type: "git",
        url: REPOSITORY_URL,
      },
    };
  }

  /** Reads and validates an individual project's package.json. */
  public readPackageManifest(options: {
    projectPath: string;
    workspaceRoot: string;
  }): PackageManifest {
    const filePath = path.join(
      options.workspaceRoot,
      options.projectPath,
      "package.json",
    );
    const content = readFileSync(filePath, "utf8");
    const parsed: unknown = JSON.parse(content);

    return PACKAGE_MANIFEST_SCHEMA.parse(parsed);
  }

  /** Reads and validates the workspace root package.json. */
  public readRootManifest(workspaceRoot: string): RootPackageManifest {
    const filePath = path.join(workspaceRoot, ROOT_PACKAGE_JSON_PATH);
    const content = readFileSync(filePath, "utf8");
    const parsed: unknown = JSON.parse(content);

    return ROOT_PACKAGE_JSON_SCHEMA.parse(parsed);
  }

  /** Writes the derived metadata across all publishable packages. */
  public writeAll(workspaceRoot: string): void {
    const rootManifest = this.readRootManifest(workspaceRoot);

    for (const projectPath of PUBLISHABLE_PACKAGE_PROJECTS) {
      this.writePackageManifest({
        projectPath,
        rootManifest,
        workspaceRoot,
      });
    }
  }

  /** Writes the derived metadata into an individual package's package.json. */
  public writePackageManifest(options: {
    projectPath: string;
    rootManifest: RootPackageManifest;
    workspaceRoot: string;
  }): void {
    const { projectPath, rootManifest, workspaceRoot } = options;
    const manifest = this.readPackageManifest({ projectPath, workspaceRoot });
    const expected = this.deriveMetadata({ projectPath, rootManifest });

    const updated: Record<string, unknown> = {
      ...manifest,
      author: expected.author,
      bugs: expected.bugs,
      homepage: expected.homepage,
      license: expected.license,
      repository: expected.repository,
    };

    const sorted = this.sortKeys(updated);
    const filePath = path.join(workspaceRoot, projectPath, "package.json");
    const jsonContent = `${JSON.stringify(sorted, null, 2)}\n`;

    writeFileSync(filePath, jsonContent, "utf8");
  }
}
