// ♟️ Constants

/**
 * Glob `createNodes` matches.
 *
 * It covers the conformetry configuration as well as every `project.json`,
 * even though only the latter describes a project. Nx re-runs a plugin — and
 * so invalidates cached sync-generator results — when a file matching its glob
 * changes, and the generators a workspace has come from that configuration. A
 * glob of `project.json` alone left the daemon reporting a stale "up to date"
 * after the configuration was edited.
 */
export const PROJECT_CONFIGURATION_GLOB =
  "**/{project.json,conformetry.config.*}";

/** Basename that marks a matched file as an actual project description. */
export const PROJECT_CONFIGURATION_FILENAME = "project.json";

/**
 * Key the plugin's application context is cached under on `globalThis`.
 *
 * Global rather than module-level so that loading this module twice — which
 * Nx's plugin isolation can do — still yields one NestJS context per process.
 */
export const PLUGIN_CONTEXT_GLOBAL_KEY = "__conformetryPluginContext";

/**
 * Root of the workspace-level project, which is skipped during inference.
 *
 * Every instance in the workspace sits inside it, so inferring a target there
 * would duplicate every other project's work under one uncacheable task.
 */
export const WORKSPACE_PROJECT_ROOT = ".";
