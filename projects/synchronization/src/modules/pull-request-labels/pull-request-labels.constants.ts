// ♟️ Constants

import { z } from "zod";

import type { ConventionalLabel } from "./pull-request-labels.types";

/**
 * The client every call goes through.
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

/** The vocabulary's single source of truth, relative to the workspace root. */
export const CONVENTIONAL_CONFIG_PATH = "configuration/conventional.config.cjs";

/** Color every `type:` label carries, so the family reads as one at a glance. */
export const TYPE_LABEL_COLOR = "d93f0b";

/** Color every `scope:` label carries. */
export const SCOPE_LABEL_COLOR = "1d76db";

/**
 * The labels no configuration derives.
 *
 * `do-not-merge` blocks a pull request while it is present, and the two
 * `source:` labels declare who opened one. None of the three is a type or a
 * scope, so none of them can be read out of `conventional.config.cjs` — they
 * are written here and reconciled alongside the derived ones.
 */
export const STATIC_LABELS: ConventionalLabel[] = [
  {
    color: "b60205",
    description: "Do not merge this pull request yet",
    name: "do-not-merge",
  },
  {
    color: "e99695",
    description: "Opened by a coding agent",
    name: "source:agent",
  },
  {
    color: "e99695",
    description: "Opened by a human",
    name: "source:human",
  },
];

/**
 * The prefixes whose labels this reconciliation owns.
 *
 * A label outside them is somebody else's — `dependencies`, a milestone
 * helper, anything a human added — so it is neither expected nor reported.
 */
export const TRACKED_LABEL_PREFIXES = ["scope:", "source:", "type:"];

/**
 * How many labels one `gh label list` page asks for.
 *
 * Well above the roughly forty this vocabulary names, so the whole set arrives
 * in one call and a label past the end is never mistaken for a missing one.
 */
export const LABEL_LIST_LIMIT = "500";

/** The shape `gh label list --json name,color,description` returns. */
export const repositoryLabelsSchema = z.array(
  z.object({
    color: z.string(),
    description: z.string(),
    name: z.string(),
  }),
);

/** The shape `conventional.config.cjs` exports, as much of it as is read here. */
export const conventionalConfigSchema = z.object({
  scopes: z.array(z.object({ description: z.string(), name: z.string() })),
  types: z.array(z.object({ description: z.string(), name: z.string() })),
});
