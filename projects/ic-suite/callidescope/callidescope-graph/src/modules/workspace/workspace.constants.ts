// ♟️ Constants

/**
 * Directory names a project scan never descends into.
 *
 * Each one either holds no source of its own (`node_modules`, dependency and
 * build caches) or is generated output (`dist`, `build`, `coverage`) — walking
 * into any of them either finds nothing or finds a `tsconfig.json` that
 * belongs to a dependency, not a project this run should trace.
 */
export const EXCLUDED_SCAN_DIRECTORY_NAMES = [
  "node_modules",
  ".git",
  ".nx",
  ".conformetry",
  "dist",
  "build",
  "coverage",
  "out",
] as const;

/**
 * The file whose presence in a project root makes it something another
 * project can depend on.
 *
 * Read once per project, when one is discovered, and recorded as
 * `WorkspaceProject.hasPackageManifest`. Its contents are never parsed:
 * whether a directory is a package is the whole question, and a declared
 * dependency list would be the wrong answer to it anyway, since the closure is
 * derived from what the compiler really read.
 *
 * **A project root holding no manifest is not a dependency-closure
 * destination.** The manifest is what makes a directory something another
 * project can depend *on*. A root holding only a `tsconfig.json` is where a
 * repository keeps shared settings — a `configuration/` directory of base
 * compiler options and lint configuration — and shared settings are read by
 * every project rather than depended on by any.
 *
 * Without this, that one directory drags the whole workspace into every
 * closure. Each package's `tsconfig.json` `include`s its own tooling
 * configuration files, each of those imports out of the shared directory, so
 * the compiler really reads them and `getSourceFiles` truthfully says so. The
 * shared directory joins the closure, its program then covers every
 * configuration file in it, and those reach every toolchain the repository
 * configures — a leaf package's closure measured 18 projects rather than 3,
 * dearer than one whole-workspace run as soon as a few projects are affected
 * in a continuous-integration run.
 *
 * What the rule costs: a call into such a directory resolves to no frame in a
 * scoped run, as it did before closures existed. Only a *destination* is
 * refused — a named directory is a starting project and an unscoped run names
 * every project, so one is still traced in full and a whole-workspace run's
 * findings are untouched.
 */
export const PACKAGE_MANIFEST_NAME = "package.json";

/**
 * The file whose presence in a directory makes it a project.
 *
 * Named once rather than spelled at each site, so the file a whole-workspace
 * scan looks for and the file an exclusion is judged against can never drift
 * apart — a project excluded by a path that is not the one discovery reads
 * would be excluded from nothing.
 */
export const PROJECT_CONFIGURATION_NAME = "tsconfig.json";

/**
 * Directory holding a project's test scaffolding.
 *
 * Its files are not named like tests — `mocks.ts`, `setup.ts` — but they exist
 * only for tests, and a report that counted them would describe a package's
 * fixtures as its control flow.
 */
export const TEST_DIRECTORY_SEGMENT = "testing";

/** Matches a test file, whatever tier it declares. */
export const TEST_FILE_PATTERN =
  /\.(?:end-to-end|integration|unit)?\.?(?:spec|test)\.[cm]?[jt]sx?$/;
