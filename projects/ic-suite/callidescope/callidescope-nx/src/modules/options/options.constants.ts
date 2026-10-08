// ♟️ Constants

/** Name this plugin is registered under in a workspace's `nx.json`. */
export const CALLIDESCOPE_NX_PLUGIN_NAME = "@callidescope/nx";

/**
 * Names of the inferred per-project targets, when the registration names none.
 *
 * Short and unprefixed, so a run reads `nx run callidescope-nx:trace` rather
 * than repeating the tool's name on both sides of the colon. Every one of them
 * is overridable from the `nx.json` registration, which is the escape hatch
 * for a workspace where a name this general would collide.
 */
export const DEFAULT_TRACE_TARGET_NAME = "trace";

/** Name of the inferred per-project depth-lookup target. */
export const DEFAULT_DEPTH_TARGET_NAME = "depth";

/** Name of the inferred per-project breadth-lookup target. */
export const DEFAULT_BREADTH_TARGET_NAME = "breadth";

/**
 * Name of the inferred per-project gate target.
 *
 * Named after what it decides rather than after what it measures. `trace`,
 * `depth`, and `breadth` all print something a reader asked for; this one is
 * the target here a pipeline is meant to read an exit code from, so it says
 * `gate`.
 */
export const DEFAULT_GATE_TARGET_NAME = "gate";

/**
 * Where the callidescope configuration lives, when the registration names no
 * path.
 *
 * Tried in order; the first that exists wins. Mirrors what
 * `@callidescope/configuration` searches for on its own, so a workspace that
 * never registers a path behaves the same through Nx as it does at a prompt.
 */
export const DEFAULT_CONFIGURATION_PATHS = [
  "callidescope.config.ts",
  "configuration/callidescope.config.ts",
] as const;

/** Marks a project as one whose directory holds a TypeScript program. */
export const PROJECT_PROGRAM_FILENAME = "tsconfig.json";

/**
 * Root of the workspace-level project, which is skipped during inference.
 *
 * Every other project sits inside it, so a target there would trace the whole
 * workspace under one uncacheable task — which is what the workspace-wide
 * `callidescope` target already does.
 */
export const WORKSPACE_PROJECT_ROOT = ".";
