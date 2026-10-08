// ♟️ Constants

/**
 * The client every call goes through.
 *
 * Named rather than spelled at the call site, so what a PATH-shadowed
 * executable in a test has to be called is stated in one place.
 */
export const GITHUB_CLI_BINARY = "gh";

/** How the two label families this reconciliation writes are recognized. */
export const SCOPE_LABEL_PREFIX = "scope:";
export const TYPE_LABEL_PREFIX = "type:";

/**
 * The exact field labels `issue.yml` gives its Type and Scope dropdowns.
 *
 * GitHub renders a submitted issue form field as `### <label>` followed by
 * the answer, using the field's authored `label:` verbatim — so these must
 * track `.github/ISSUE_TEMPLATE/issue.yml` exactly.
 */
export const TYPE_FIELD_LABEL = "Type";
export const SCOPE_FIELD_LABEL = "Scope";

/** An issue number, as an argument may spell one. */
export const ISSUE_NUMBER_PATTERN = /^\d+$/u;
