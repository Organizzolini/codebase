// ♟️ Constants

/** The plugin's package name, used to find its entry in `nx.json`. */
export const CONFORMETRY_NX_PLUGIN_NAME = "@conformetry/nx";

/**
 * Root-level config filenames tried, in order, when the registration names none.
 *
 * All at the workspace root rather than under any particular repository's
 * convention for where configuration lives; a workspace that keeps it
 * elsewhere says so in its `nx.json` plugin entry. Every extension here is one
 * the configuration loader can read — an extensionless `.conformetryrc` is
 * deliberately absent, because it would resolve and then fail as an unknown
 * file type.
 *
 * The first entry doubles as the name reported when nothing is found, so it
 * stays the most conventional of them.
 */
export const DEFAULT_CONFIGURATION_PATHS = [
  "conformetry.config.ts",
  "conformetry.config.mts",
  "conformetry.config.cts",
  "conformetry.config.js",
  "conformetry.config.mjs",
  "conformetry.config.cjs",
  "conformetry.config.json",
  "conformetry.config.jsonc",
  "conformetry.json",
  "conformetry.jsonc",
  ".conformetryrc.ts",
  ".conformetryrc.js",
  ".conformetryrc.json",
  "conformetryrc.ts",
  "conformetryrc.js",
  "conformetryrc.json",
] as const;

/** Filename the workspace's Nx configuration is read from. */
export const NX_CONFIGURATION_FILENAME = "nx.json";

/** Name of the validation target inferred onto every in-scope project. */
export const DEFAULT_VALIDATE_TARGET_NAME = "conformetry-validate";

/**
 * Option names that configure this plugin rather than a generator.
 *
 * Everything else a consumer passes is treated as a template substitution.
 */
export const PLUGIN_OPTION_NAMES = ["configurationPath", "validateTargetName"];
