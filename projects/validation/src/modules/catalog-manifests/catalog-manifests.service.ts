import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import {
  CATALOG_PIN_PATTERN,
  CATALOG_PROTOCOL,
  DEPENDENCY_SECTION_NAMES,
  INTERNAL_PACKAGE_SCOPES,
  WORKSPACE_PROTOCOL_PREFIX,
  WORKSPACE_SCOPES,
} from "./catalog-manifests.constants";

import type { PackageManifest } from "./catalog-manifests.types";

/**
 * Reads every workspace manifest and says which dependencies are mis-pinned.
 *
 * The policy is one rule in two directions: a package this workspace publishes
 * is pinned `workspace:*`, and everything else is pinned to a catalog, the
 * default `catalog:` or a named one such as `catalog:ic-suite`. A version
 * range written out in a manifest is the thing being prevented — it puts two
 * projects on two versions of the same dependency with nothing to notice.
 */
@Injectable()
export class CatalogManifestsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Every project manifest nested under `directoryPath`, at any depth. A
   * directory with its own `package.json` is a project and is not descended
   * into further; a directory without one is a domain or grouping folder and
   * is searched recursively.
   */
  private findManifestPaths(directoryPath: string): string[] {
    const manifestPaths: string[] = [];

    for (const child of readdirSync(directoryPath, { withFileTypes: true })) {
      if (!child.isDirectory()) {
        continue;
      }

      const childPath = path.join(directoryPath, child.name);
      const manifestPath = path.join(childPath, "package.json");

      if (existsSync(manifestPath)) {
        manifestPaths.push(manifestPath);
        continue;
      }

      manifestPaths.push(...this.findManifestPaths(childPath));
    }

    return manifestPaths;
  }

  /** Whether this dependency names one of this workspace's own packages. */
  private isInternalWorkspaceDependency(dependencyName: string): boolean {
    return INTERNAL_PACKAGE_SCOPES.some((scope) =>
      dependencyName.startsWith(scope),
    );
  }

  // 🌎 Public Methods

  /** Reads and parses one manifest. */
  public readManifest(manifestPath: string): PackageManifest {
    return JSON.parse(readFileSync(manifestPath, "utf8")) as PackageManifest;
  }

  /** Finds every workspace `package.json` the catalog policy covers. */
  public resolveWorkspaceManifestPaths(workspaceRoot: string): string[] {
    const manifestPaths = [path.join(workspaceRoot, "package.json")];

    for (const workspaceScope of WORKSPACE_SCOPES) {
      const scopePath = path.join(workspaceRoot, workspaceScope);

      if (!existsSync(scopePath)) {
        continue;
      }

      manifestPaths.push(...this.findManifestPaths(scopePath));
    }

    return manifestPaths;
  }

  /** Every mis-pinned dependency in one manifest, in every section. */
  public validateManifestDependencies(
    manifestPath: string,
    manifest: PackageManifest,
  ): string[] {
    const violations: string[] = [];
    const relativeManifestPath = path.relative(process.cwd(), manifestPath);

    for (const sectionName of DEPENDENCY_SECTION_NAMES) {
      for (const [dependencyName, dependencyVersion] of Object.entries(
        manifest[sectionName] ?? {},
      )) {
        const location = `${relativeManifestPath} -> ${sectionName}.${dependencyName}`;

        if (this.isInternalWorkspaceDependency(dependencyName)) {
          if (!dependencyVersion.startsWith(WORKSPACE_PROTOCOL_PREFIX)) {
            violations.push(
              `${location} must use workspace:* (found ${dependencyVersion})`,
            );
          }

          continue;
        }

        if (!CATALOG_PIN_PATTERN.test(dependencyVersion)) {
          violations.push(
            `${location} must use ${CATALOG_PROTOCOL} (found ${dependencyVersion})`,
          );
        }
      }
    }

    return violations;
  }
}
