/**
 * Syncpack Configuration
 * Purpose: Enforce consistent dependency versions and semver range formats across all workspace packages
 * Usage (Check): pnpm exec syncpack lint --config configuration/syncpack.config.cjs
 * Usage (Fix): pnpm exec syncpack fix --config configuration/syncpack.config.cjs
 * CI Workflow: .github/workflows/lint-codebase.yml
 * @see https://jamiemason.github.io/syncpack/
 */

module.exports = {
  // Source files to analyze for dependency consistency
  source: [
    "package.json",
    "applications/*/package.json",
    "applications/meanderaw/*/package.json",
    "packages/*/package.json",
    "packages/ic-suite/*/*/package.json",
    "tools/*/package.json",
  ],

  // Version groups: enforce workspace protocol for internal @codebase/* packages
  versionGroups: [
    {
      label: "Use workspace protocol for internal packages",
      packages: ["**"],
      dependencies: ["@codebase/*"],
      dependencyTypes: ["dev", "prod"],
      pinVersion: "workspace:*",
    },
  ],

  // Semver groups: ignore external dependencies and enforce caret ranges where applicable
  semverGroups: [
    {
      isIgnored: true,
      dependencies: ["**", "!@codebase/*"],
      packages: ["**"],
    },
    {
      // pnpm.overrides use selector syntax (e.g., "package@<1.0.0": ">=1.0.0") for security patches
      // that syncpack cannot validate with standard semver ranges
      isIgnored: true,
      dependencyTypes: ["pnpmOverrides"],
      dependencies: ["**"],
      packages: ["**"],
    },
    {
      range: "^",
      dependencies: ["**"],
      packages: ["**"],
    },
  ],
};
