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
export const PLACEHOLDER_PULL_REQUEST_NUMBER = "<number>";

/** The label blocking a pull request for as long as it is present. */
export const DO_NOT_MERGE_LABEL = "do-not-merge";

/** The two labels that may declare who opened a pull request, and nothing else. */
export const SOURCE_LABELS = ["source:agent", "source:human"];

/** How the two label families are recognized. */
export const SCOPE_LABEL_PREFIX = "scope:";
export const SOURCE_LABEL_PREFIX = "source:";
export const TYPE_LABEL_PREFIX = "type:";

/**
 * How a conventional title is read.
 *
 * The scope group is optional even though the convention requires a scope.
 * commitlint's `scope-empty` rule rejects a title with no scope, so in a
 * workflow run 📝 Validate Pull Request Title fails first and this check never
 * sees one. Run by hand with a pull request number it runs ahead of any title
 * check, so matching the scope as optional keeps it correct there too, and is
 * defense in depth everywhere else. The subject group is deliberately not
 * optional: a title that is only a prefix is not a title.
 */
export const CONVENTIONAL_TITLE_PATTERN =
  /^([a-z][a-z-]*)(?:\(([^()]+)\))?!?:\s+(?<subject>\S.*)$/u;

/**
 * What one title's scope group is split on.
 *
 * commitlint's `scope-enum` splits on both, so one title may name several
 * scopes and each of them is expected to have its own label.
 */
export const TITLE_SCOPE_SEPARATOR_PATTERN = /[,/]/u;

/** A pull request number, as an argument may spell one. */
export const PULL_REQUEST_NUMBER_PATTERN = /^\d+$/u;

/** How to run this check, printed whenever the input could not be used. */
export const USAGE_LINES = [
  "Usage: validation pull-request-metadata <pull-request-number>",
  "   or: PULL_REQUEST_TITLE=… PULL_REQUEST_LABELS=… PULL_REQUEST_ASSIGNEES=… validation pull-request-metadata",
];
