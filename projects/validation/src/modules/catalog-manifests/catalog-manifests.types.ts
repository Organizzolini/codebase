// 🏷️ Types

/** The dependency sections the catalog policy covers. */
export type DependencySectionName =
  | "dependencies"
  | "devDependencies"
  | "optionalDependencies"
  | "peerDependencies";

/** As much of a `package.json` as this policy reads. */
export interface PackageManifest {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  name?: string;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}
