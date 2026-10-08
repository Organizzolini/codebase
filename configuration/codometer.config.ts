import {
  CODOMETER_COMMENT_LANGUAGES,
  type CodometerConfiguration,
  type CodometerCustomStatistic,
} from "@codometer/configuration";

// ♟️ Conventions

/**
 * Name of the target holding a project's compiled JavaScript.
 *
 * Written out rather than derived: the pull request report joins each measured
 * target against the same target measured on the base branch, and the name is
 * the join key.
 */
const COMPILED_TARGET_NAME = "Compiled JavaScript";

// 💬 Comment Budgets

/**
 * What each comment-budget counter is labeled, keyed by the language its
 * `comment` selector names.
 *
 * A display name rather than the lowercase language identifier itself, so a
 * badge reads "TypeScript Comment Budget" rather than "typescript Comment
 * Budget". Also what the limit below reads its metric path from, so a label
 * can never drift from the counter it gates.
 */
const COMMENT_LANGUAGE_LABELS = {
  css: "CSS",
  hcl: "HCL",
  python: "Python",
  shell: "Shell",
  sql: "SQL",
  toml: "TOML",
  typescript: "TypeScript",
  yaml: "YAML",
} as const satisfies Record<
  (typeof CODOMETER_COMMENT_LANGUAGES)[number],
  string
>;

/**
 * `comment` selectors carry no inheritance, and a selector naming no
 * `language` covers every one of them — shell included. Expressing "every
 * language at 128 words, except shell at 256" therefore needs the general
 * budget written out once per language rather than once for all of them, so
 * shell can be left for its own, looser selector below instead of also
 * matching this one.
 *
 * A comment block is capped by how much it says, not how wide it is: every
 * linter here already holds a line to 80 columns, so a character budget would
 * only restate it. The budget is per block — the run of comment lines a
 * reader takes as one thought, ended by a blank line — which is what makes a
 * sprawling explanation the thing reported rather than a long word.
 */
const generalCommentBudgets: CodometerCustomStatistic[] =
  CODOMETER_COMMENT_LANGUAGES.filter((language) => language !== "shell").map(
    (language) => ({
      comment: { language, maximumWords: 128 },
      label: `${COMMENT_LANGUAGE_LABELS[language]} Comment Budget`,
    }),
  );

/**
 * Shell is loosened rather than held to the shared budget: `scripts/shell/`
 * holds command references — grep, netstat — whose whole body is one comment
 * block documenting flags. That is a manual page, not a sprawling
 * explanation, and condensing it would delete the thing the file exists for.
 * 256 still catches real sprawl; the longest reference here runs to 190.
 */
const shellCommentBudget: CodometerCustomStatistic = {
  comment: { language: "shell", maximumWords: 256 },
  label: `${COMMENT_LANGUAGE_LABELS.shell} Comment Budget`,
};

/** Every comment-budget counter declared above, in the order they render. */
const commentBudgets: CodometerCustomStatistic[] = [
  ...generalCommentBudgets,
  shellCommentBudget,
];

/** Every custom statistic's own label, in declaration order. */
function selectAllLabels(
  statistics: readonly CodometerCustomStatistic[],
): string[] {
  return statistics.map((statistic) => statistic.label);
}

// 🧱 Shared Configuration

/**
 * The counters every measurement in this repository shares, spread by every
 * project's own output.
 *
 * The file-name counters are the file suffixes this repository's project
 * structure enforces. Counting them says what the TypeScript total is
 * actually made of — how much is services, and how much is the tests for
 * them. The comment budgets stay unset for `documentation`: gating this prose
 * is not a reason to start gating every JSDoc comment against the same
 * budget.
 */
const customStatistics: CodometerCustomStatistic[] = [
  { label: "Module Files", patterns: ["**/*.module.ts"] },
  { label: "Service Files", patterns: ["**/*.service.ts"] },
  { label: "Command Files", patterns: ["**/*.command.ts"] },
  { label: "Constants Files", patterns: ["**/*.constants.ts"] },
  { label: "Types Files", patterns: ["**/*.types.ts"] },
  { label: "Utilities Files", patterns: ["**/*.utilities.ts"] },
  { label: "TypeORM Entities", patterns: ["**/*.entity.ts"] },
  { label: "Unit Tests", patterns: ["**/*.unit.test.ts"] },
  { label: "Integration Tests", patterns: ["**/*.integration.test.ts"] },
  { label: "End To End Tests", patterns: ["**/*.end-to-end.test.ts"] },
  // Not a file-name counter but a symbol one, and rendered beside the
  // built-in TypeScript counters rather than under Conventions. Every
  // service here is an injected singleton, so a static method appearing
  // anywhere is worth seeing in the report.
  {
    color: "166534",
    group: "typescript",
    label: "Static Methods",
    symbols: { kinds: ["method"], modifiers: ["static"] },
  },
  ...commentBudgets,
];

/**
 * A comment-budget breach gates the same way any other counter does: through
 * an ordinary `limits[]` entry addressing its `custom.<label>` metric path,
 * whose value is a *count* of the blocks that broke the selector's own
 * `maximumWords` — so the limit that gates it is a count of zero, not a word
 * total. A counter with no limit only counts; declaring one here is what
 * turns it into a cap. Derived from `commentBudgets` rather than written out
 * a second time, so a label can never drift between the counter and the
 * limit that gates it.
 */
const commentBudgetLimits: CodometerConfiguration["limits"] =
  commentBudgets.map((statistic) => ({
    metric: `custom.${statistic.label}`,
    value: 0,
  }));

/**
 * What every measurement in this repository shares, spread by every project.
 *
 * Imported and spread by each project's `codometer.config.ts`, the same way
 * each project's `eslint.config.ts` spreads the base config beside this file.
 * A plain object rather than a function: nothing here depends on which project
 * is reading it, so nothing here has to be told.
 *
 * `format` is set here rather than left to a code-level fallback — the schema
 * has none — so this is where the repository's one intentional default lives,
 * and every project inherits it by spreading this object.
 *
 * A named export rather than the default: codometer's loader only ever reads
 * a configuration file's default export, and that has to be
 * `workspaceConfiguration` below, so the workspace-root Nx target's `--config`
 * resolves the exclusions and README destination that belong to the
 * repository alone. A project spreading this object therefore imports it by
 * name rather than as a default.
 */
export const codometerConfiguration = {
  // Measures every counter declared above, regardless of which output below
  // selects it — an output's own `custom` only picks labels back out of this.
  custom: customStatistics,
  // Target an unqualified limit's metric path belongs to, so the comment
  // budgets below can be written as `custom.<label>` rather than
  // `codebase.custom.<label>`.
  defaultInput: "codebase",
  format: "markdown",
  // A comment budget declared and never limited is a counter, not a cap.
  limits: commentBudgetLimits,
  // Where each project leaves the report the pull request's ⏲️ Codometer
  // section reads. Declared here rather than passed as `--output-json` by the
  // Nx target, because it is the same path for every project and a
  // destination is configuration.
  //
  // The `markdown` entry beside it is what the per-project `codometer:write`
  // Nx configuration writes into each project's own README. Every output
  // selects every label `custom` declares, so without this entry a project's
  // README badges would silently lose every convention counter the `json`
  // output still reports.
  outputs: [
    {
      custom: selectAllLabels(customStatistics),
      path: "codometer-report.json",
      type: "json",
    },
    {
      custom: selectAllLabels(customStatistics),
      path: "README.md",
      type: "markdown",
    },
  ],
  // Python lives in a uv workspace, so the interpreter is reached through uv
  // rather than being on PATH.
  python: { command: "uv run python" },
} satisfies CodometerConfiguration;

// 🎯 Targets

/**
 * Everything a project's compiled-output input holds except which files it
 * is.
 *
 * Spread by each project that emits compiled JavaScript, which then supplies
 * the one field that differs — the glob naming its own build output. Every
 * build is written to the project's own `dist/`, so the input needs no
 * `directory` of its own: what it measures already sits beneath the project
 * being measured.
 *
 * A project that emits nothing declares no input at all rather than an empty
 * one. That is the difference between a project that was never going to have a
 * build and one whose build has not run: only the second should read as an
 * input matching no files.
 */
export const compiledJavaScriptTarget = {
  analyses: ["size"],
  compression: "gzip",
  name: COMPILED_TARGET_NAME,
} satisfies Omit<
  NonNullable<CodometerConfiguration["inputs"]>[number],
  "include"
>;

// 🏛️ Workspace

/**
 * What a run measuring the whole repository measures.
 *
 * The default export, because codometer's loader only ever reads a
 * configuration file's default export and the root project's `codometer`
 * target points `--config` directly at this file. No input of its own: the
 * repository is the one thing measured without a glob, and its build output
 * belongs to the projects that emit it.
 */
const workspaceConfiguration = {
  ...codometerConfiguration,
  // What this repository does not measure lives in an ignore file, the way
  // every other tool here keeps its exclusions. Files `.gitignore` covers are
  // already absent — discovery reads those files itself — so the ignore file
  // only has to name what is committed but generated.
  excludeFrom: ["configuration/.codometerignore"],
  // Replaces the shared destination rather than adding to it: the repository
  // writes badges and its report for pull request change diffs. The same
  // counters as the shared JSON output, so the README badges keep reporting
  // what they always have.
  outputs: [
    {
      custom: selectAllLabels(customStatistics),
      path: "codometer-report.json",
      type: "json",
    },
    {
      custom: selectAllLabels(customStatistics),
      description:
        "Repository statistics measured by [codometer](projects/ic-suite/codometer/codometer-cli), regenerated by `nx run codebase:codometer`.",
      path: "README.md",
      type: "markdown",
    },
  ],
} satisfies CodometerConfiguration;

/**
 * What codometer resolves for the repository itself, and for any folder here
 * that is not a project — `configuration/`, `scripts/` — which then gets the
 * exclusions and README destination that belong to the repository alone. A
 * project declares its own `codometer.config.ts` and spreads the named
 * `codometerConfiguration` export above instead, the same way each project's
 * `eslint.config.ts` spreads the base config beside this file.
 *
 * @see [`projects/ic-suite/codometer/codometer-examples/README.md`](../projects/ic-suite/codometer/codometer-examples/README.md)
 * for the guided tour, and
 * [`projects/ic-suite/codometer/codometer-examples/AGENTS.md`](../projects/ic-suite/codometer/codometer-examples/AGENTS.md)
 * for the message-to-example lookup table.
 */
export default workspaceConfiguration;
