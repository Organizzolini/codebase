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

      for (const scopeChild of readdirSync(scopePath, {
        withFileTypes: true,
      })) {
        if (!scopeChild.isDirectory()) {
          continue;
        }

        const manifestPath = path.join(
          scopePath,
          scopeChild.name,
          "package.json",
        );

        if (existsSync(manifestPath)) {
          manifestPaths.push(manifestPath);
        }
      }
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
