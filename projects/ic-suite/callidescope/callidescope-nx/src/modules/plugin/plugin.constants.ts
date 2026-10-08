// ♟️ Constants

/**
 * Glob `createNodes` matches.
 *
 * It covers the callidescope configuration as well as every `project.json`,
 * even though only the latter describes a project. Nx re-runs a plugin when a
 * file matching its glob changes, and the target it infers carries the
 * configured limits in its cache key — so a glob of `project.json` alone would
 * leave the daemon reporting a stale result after the configuration was
 * edited.
 */
export const PROJECT_CONFIGURATION_GLOB =
  "**/{project.json,callidescope.config.*}";

/** Basename that marks a matched file as an actual project description. */
export const PROJECT_CONFIGURATION_FILENAME = "project.json";

/**
 * Cache input naming the project's own callidescope configuration — the file
 * the limits its gate enforces are written in.
 *
 * `{projectRoot}`-relative rather than a workspace-wide glob, which is the
 * whole point of it: a glob reaching every project's file would invalidate
 * every project's gate whenever any one project changed a limit, which is the
 * uncacheable workspace run this target replaces. A dependency's file is
 * covered by `^default` instead, because a scoped run measures its
 * dependencies and is judged by what they declared.
 *
 * A glob rather than one filename because the loader reads eight extensions,
 * and it matches nothing at all in a project that configures nothing — which
 * is what leaves such a project carrying the target and inheriting the
 * workspace's limits.
 */
export const PROJECT_LIMITS_INPUT = "{projectRoot}/callidescope.config.*";

/**
 * Key the plugin's application context is cached under on `globalThis`.
 *
 * Global rather than module-level so that loading this module twice — which
 * Nx's plugin isolation can do — still yields one NestJS context per process.
 */
export const PLUGIN_CONTEXT_GLOBAL_KEY = "__callidescopePluginContext";

/**
 * What a run prints when it read none of the code it was judging.
 *
 * The whole-run rule below cannot catch this one, and the difference is the
 * dependency closure. A run traces the projects its own imports reach and
 * judges only the projects it was pointed at, so a project whose own sources
 * were all excluded still has a non-empty run to show — its dependencies' —
 * while owning no report content and therefore no finding. It would pass green
 * over code nothing read, which is the failure the whole-run rule exists to
 * prevent arriving through a second door.
 *
 * One rendering for both targets, saying which of them fails on it, because
 * the two differ here and only here: a `gate` fails, a `trace` prints this and
 * passes. A project the workspace configuration excludes gets no gate and
 * keeps its trace, and every such project reads nothing of its own by
 * definition — so a trace that failed on this would be permanently red for
 * being configured exactly as it was asked to be, which is a red task a reader
 * learns to ignore.
 *
 * Files rather than callables, for the reason
 * `ProjectReportsService.findUnreadProjects` states: a project can legitimately
 * hold files that declare no callable, and those were read.
 *
 * Named rather than counted, because the projects a run judges are not always
 * the one the task is named after: `--projects` may name several, and a reader
 * needs to know which of them the run never opened.
 */
export const reportUnreadProjects = (projectNames: readonly string[]): string =>
  [
    "## Read nothing of its own (0 files)",
    "",
    `This run judged ${projectNames.length === 1 ? "a project" : "projects"} whose own code it never read:`,
    "",
    ...projectNames.map((projectName) => `- \`${projectName}\``),
    "",
    "A `gate` fails on this and a `trace` does not: a gate that never looked",
    "cannot tell a clean project from an unread one, where a trace decides",
    "nothing and is a report for a reader to open. The run itself was not",
    "empty — the dependencies it traced were read — so only the judged",
    "project's own sources went missing.",
    "",
    "Check `exclude` and `excludeFrom` in the workspace callidescope",
    "configuration and `exclude` in the project's own `callidescope.config.*`",
    "for a pattern matching everything that project holds, and check that the",
    "project still holds sources its `tsconfig.json` includes.",
  ].join("\n");

/**
 * What a gate prints when the run it judged read no code at all.
 *
 * A gate that passes because it never looked reports the project as clean and
 * leaves nothing in the output to say otherwise, which is why the
 * `callidescope` command fails the same case. Reached when a run judges no
 * project of its own — every scoped run is answered by `reportUnreadProjects`
 * above, which names what went unread instead of only saying that something
 * did.
 */
export const EMPTY_TRACE_REPORT = [
  "## Traced nothing (0 callables)",
  "",
  "This gate read no code, so it judged none. It fails rather than passing:",
  "a gate that never looked cannot tell a clean project from an unread one.",
  "",
  "Check `exclude` and `excludeFrom` in the workspace callidescope",
  "configuration and in this project's own `callidescope.config.*` for a",
  "pattern matching everything the project holds.",
].join("\n");

/**
 * What a gate prints when its Nx selection resolved to no directory.
 *
 * The same failure one step earlier: nothing was traced because there was
 * nothing to point a trace at, so there is no verdict and the task must not
 * record one.
 */
export const EMPTY_SCOPE_REPORT = [
  "## Traced nothing (no directories in scope)",
  "",
  "This gate's Nx selection resolved to no directory, so nothing was traced",
  "and nothing was judged. It fails rather than passing: a gate that never",
  "looked cannot tell a clean project from an unread one.",
  "",
  "Check the `projects` and `tags` this target was given, and whether the",
  "projects they name still hold a root of their own.",
].join("\n");
