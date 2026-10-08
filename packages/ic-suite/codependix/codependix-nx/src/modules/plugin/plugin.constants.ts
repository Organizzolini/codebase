// ♟️ Constants

/**
 * Glob `createNodes` matches.
 *
 * It covers every codependix configuration as well as every `project.json`,
 * even though only the latter describes a project. Nx re-runs a plugin when a
 * file matching its glob changes, so a glob of `project.json` alone would
 * leave the daemon holding inference made before a configuration existed.
 */
export const PROJECT_CONFIGURATION_GLOB =
  "**/{project.json,codependix.config.*}";

/** Basename that marks a matched file as an actual project description. */
export const PROJECT_CONFIGURATION_FILENAME = "project.json";

/**
 * Cache input naming the project's own codependix configuration.
 *
 * `{projectRoot}`-relative rather than a workspace-wide glob: a glob reaching
 * every project's file would invalidate every gate whenever any one project
 * edited its own. A dependency's file is covered by `^default` instead. A
 * glob rather than one filename because the loader reads seven extensions.
 */
export const PROJECT_CONFIGURATION_INPUT = "{projectRoot}/codependix.config.*";

/**
 * Key the plugin's application context is cached under on `globalThis`.
 *
 * Global rather than module-level so that loading this module twice — which
 * Nx's plugin isolation can do — still yields one NestJS context per process.
 */
export const PLUGIN_CONTEXT_GLOBAL_KEY = "__codependixPluginContext";

/** Name this plugin is registered under in a workspace's `nx.json`. */
export const CODEPENDIX_NX_PLUGIN_NAME = "@codependix/nx";

/**
 * Name of the inferred per-project gate target, when the registration names
 * none.
 *
 * Prefixed, unlike `@callidescope/nx`'s bare `gate`, because a workspace
 * registering both plugins would otherwise infer two targets under one name,
 * and Nx keeps whichever plugin it ran last without saying so.
 */
export const DEFAULT_GATE_TARGET_NAME = "codependix-gate";

/**
 * Where the codependix configuration lives, when the registration names no
 * path.
 *
 * Tried in order; the first that exists wins, and the first is assumed when
 * neither does. The same two places `@callidescope/nx` searches, so a
 * workspace keeping both configurations together needs no registration
 * options for either.
 */
export const DEFAULT_CONFIGURATION_PATHS = [
  "codependix.config.ts",
  "configuration/codependix.config.ts",
] as const;

/**
 * Root of the workspace-level project, which inference skips.
 *
 * Every other project sits inside it, so its dependency closure is the whole
 * workspace — which is the workspace-wide `codependix` run, not a per-project
 * gate.
 */
export const WORKSPACE_PROJECT_ROOT = ".";

/** The package whose code decides every gate's verdict. */
export const CLI_PACKAGE_NAME = "@codependix/cli";

/** The dependency specifier prefix marking a package of the same workspace. */
export const WORKSPACE_PROTOCOL = "workspace:";

/**
 * The files of a workspace package that change what a gate decides.
 *
 * Its manifest and its sources — not its tests, nor its README, which
 * codependix regenerates on the default branch. The tests are left out
 * inside the one positive glob, as an extglob: Nx's affected computation
 * reads only positive `{workspaceRoot}` inputs and ignores a negated one
 * outright, so a `!` input would still let a test-only edit select every
 * gate. `testing/` sits beside `src/`, so no glob here reaches it. A
 * package's own `tsconfig.json` is not here: the loader never reads it.
 */
export const TOOL_PACKAGE_GLOBS = [
  "package.json",
  "src/**/!(*.test.*|*.spec.*)",
] as const;

/**
 * The compiler options the gate's loader reads.
 *
 * `@swc-node/register` takes them from `SWC_NODE_PROJECT` or
 * `TS_NODE_PROJECT`, else from `tsconfig.json` in its working directory,
 * which is the workspace root. So this one file shapes every gate's
 * verdict, whichever way the command line was installed.
 */
export const WORKSPACE_TSCONFIG_INPUT = "{workspaceRoot}/tsconfig.json";
