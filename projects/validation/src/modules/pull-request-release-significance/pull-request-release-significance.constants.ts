// ♟️ Constants

import { z } from "zod";

/**
 * The client a live read goes through.
 *
 * Named rather than spelled at the call site, so what a PATH-shadowed
 * executable in a test has to be called is stated in one place.
 */
export const GITHUB_CLI_BINARY = "gh";

/** The variable GitHub Actions sets to the file a step's summary is read from. */
export const STEP_SUMMARY_VARIABLE = "GITHUB_STEP_SUMMARY";

/** Said when the mirror fails, so a silent summary is never a silent bug. */
export const STEP_SUMMARY_FAILURE_MESSAGE =
  "⚠️ Unable to write the report to GITHUB_STEP_SUMMARY";

/** A pull request number, as an argument or the environment may spell one. */
export const PULL_REQUEST_NUMBER_PATTERN = /^\d+$/u;

/** How to run this check, printed whenever the input could not be used. */
export const USAGE_LINES = [
  "Usage: validation pull-request-release-significance <pull-request-number>",
  "   or: PULL_REQUEST_NUMBER=… validation pull-request-release-significance",
];

/**
 * How a conventional subject line is read, a commit's or the title's alike.
 *
 * Unlike the pull-request-metadata check's title pattern, the breaking marker
 * is captured rather than discarded: whether a commit or the title itself
 * declares a breaking change is exactly what decides the required release
 * level here.
 */
export const CONVENTIONAL_SUBJECT_PATTERN =
  /^([a-z][a-z-]*)(?:\(([^()]+)\))?(?<breaking>!)?:\s+(?<subject>\S.*)$/u;

/** What one subject's scope group is split on. */
export const SUBJECT_SCOPE_SEPARATOR_PATTERN = /[,/]/u;

/**
 * The footer semantic-release treats as its own breaking-change declaration.
 *
 * A commit whose subject carries no `!` can still be breaking through this
 * footer in its body, exactly as `@semantic-release/commit-analyzer` reads it.
 */
export const BREAKING_CHANGE_FOOTER_PATTERN = /BREAKING[ -]CHANGE:/u;

/**
 * `release.config.cjs`'s single source of truth, relative to the workspace
 * root.
 *
 * Read fresh on every run rather than copied here, so a `releaseRules` change
 * needs no matching change in this check — the two cannot drift apart.
 */
export const RELEASE_CONFIG_PATH = "configuration/release.config.cjs";

/** The plugin entry in `release.config.cjs` whose options hold `releaseRules`. */
export const COMMIT_ANALYZER_PLUGIN_NAME = "@semantic-release/commit-analyzer";

/**
 * The relative significance a semantic-release level carries, `false` lowest.
 *
 * This ordering is semver itself rather than anything specific to this
 * repository's `releaseRules`, so it is the one thing here that is safe to
 * state directly instead of reading back out of configuration.
 */
export const RELEASE_LEVEL_RANK: Record<string, number> = {
  major: 3,
  minor: 2,
  patch: 1,
};

/** The shape one `releaseRules` entry must have, as much as this check reads. */
export const releaseRuleSchema = z.object({
  breaking: z.boolean().optional(),
  release: z.union([
    z.literal("major"),
    z.literal("minor"),
    z.literal("patch"),
    z.literal(false),
  ]),
  revert: z.boolean().optional(),
  scope: z.string().optional(),
  type: z.string().optional(),
});

/** The commit-analyzer plugin's options, as much as this check reads. */
export const commitAnalyzerOptionsSchema = z.object({
  releaseRules: z.array(releaseRuleSchema),
});

/** One `release.config.cjs` `plugins` entry: a bare name, or a `[name, options]` tuple. */
export const pluginEntrySchema = z.union([
  z.string(),
  z.tuple([z.string(), z.unknown()]),
]);

/** The shape `release.config.cjs` exports, as much of it as is read here. */
export const releaseConfigSchema = z.object({
  plugins: z.array(pluginEntrySchema),
});

/** The shape a `gh pr view --json title,commits` document is read as. */
export const pullRequestDocumentSchema = z.object({
  commits: z.array(z.unknown()).optional(),
  title: z.string().optional(),
});
