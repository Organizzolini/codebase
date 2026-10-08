import type {
  PACKAGE_MANIFEST_SCHEMA,
  ROOT_PACKAGE_JSON_SCHEMA,
} from "./package-manifests.constants";
import type { z } from "zod";

// 🏷️ Types

/** Mechanically derived metadata fields for a publishable package manifest. */
export interface DerivedManifestMetadata {
  author: string;
  bugs: {
    url: string;
  };
  homepage: string;
  license: string;
  repository: {
    directory: string;
    type: string;
    url: string;
  };
}

/** Individual package manifest structure validated from project package.json. */
export type PackageManifest = z.infer<typeof PACKAGE_MANIFEST_SCHEMA>;

/** Synchronization check result for one package manifest. */
export interface PackageManifestCheckResult {
  differences: string[];
  isSynchronized: boolean;
  packageName: string;
  projectPath: string;
}

/** Aggregate synchronization check result across all publishable packages. */
export interface PackageManifestsSummary {
  checkedCount: number;
  failedProjects: PackageManifestCheckResult[];
  isSynchronized: boolean;
  succeededProjects: PackageManifestCheckResult[];
}

/** Root manifest structure validated from root package.json. */
export type RootPackageManifest = z.infer<typeof ROOT_PACKAGE_JSON_SCHEMA>;
