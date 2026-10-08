// ♟️ Constants

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

/** The label a remediation command names when no number was supplied. */
export const PLACEHOLDER_ISSUE_NUMBER = "<number>";

/** The two labels that may declare who opened an issue, and nothing else. */
export const SOURCE_LABELS = ["source:agent", "source:human"];

/** How the three label families are recognized. */
export const SCOPE_LABEL_PREFIX = "scope:";
export const SOURCE_LABEL_PREFIX = "source:";
export const TYPE_LABEL_PREFIX = "type:";

/**
 * The exact field labels `issue.yml` gives its Type and Scope dropdowns.
 *
 * GitHub renders a submitted issue form field as `### <label>` followed by
 * the answer, using the field's authored `label:` verbatim — so these must
 * track `.github/ISSUE_TEMPLATE/issue.yml` exactly, not the conventional
 * config's own naming.
 */
export const TYPE_FIELD_LABEL = "Type";
export const SCOPE_FIELD_LABEL = "Scope";

/** An issue number, as an argument may spell one. */
export const ISSUE_NUMBER_PATTERN = /^\d+$/u;

/** Flag to sweep all open issues. */
export const ALL_ISSUES_FLAG = "--all";
export const ALL_ISSUES_SHORT_FLAG = "-a";

/** Pattern to identify parent issue references in issue bodies. */
export const PARENT_ISSUE_PATTERN =
  /(?:Part of\s+|Parent(?: issue)?:\s*|### Parent\s+)#(?<parentNumber>\d+)/iu;

/** Pattern to parse conventional commit-styled issue titles. */
export const CONVENTIONAL_ISSUE_TITLE_PATTERN =
  /^([a-z][a-z-]*)(?:\(([^()]+)\))?(?<breaking>!)?:\s+(?<subject>\S.*)$/u;

/** Maximum allowed nesting depth in the issue hierarchy (Spec -\> PR -\> Commit). */
export const MAX_HIERARCHY_DEPTH = 3;

/** Relative rank of release levels. */
export const RELEASE_LEVEL_RANK: Record<string, number> = {
  major: 3,
  minor: 2,
  none: 0,
  patch: 1,
};

/** Release levels associated with conventional commit types. */
export const TYPE_RELEASE_LEVEL: Record<string, string> = {
  build: "patch",
  chore: "none",
  ci: "none",
  ["docs"]: "none",
  feat: "minor",
  fix: "patch",
  perf: "patch",
  refactor: "patch",
  revert: "patch",
  style: "none",
  test: "none",
};

/** How to run this check, printed whenever the input could not be used. */
export const USAGE_LINES = [
  "Usage: validation issue-metadata <issue-number>",
  "   or: validation issue-metadata --all",
  "   or: ISSUE_BODY=… ISSUE_LABELS=… validation issue-metadata",
];
