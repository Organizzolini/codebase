// ♟️ Constants

/** The template every pull request description starts as. */
export const PULL_REQUEST_TEMPLATE_PATH = ".github/PULL_REQUEST_TEMPLATE.md";

/** The variable the workflow puts the description in. */
export const PULL_REQUEST_BODY_VARIABLE = "PULL_REQUEST_BODY";

/**
 * The four headings a description must carry, in the order they are reported.
 *
 * Read from here rather than from the template, deliberately: the headings are
 * the contract, and a template edit that dropped one should fail this check
 * rather than silently stop requiring it. The comments are the opposite case —
 * see `extractTemplateComments`.
 */
export const REQUIRED_HEADINGS = [
  "## 🌰 Summary",
  "## 📝 Details",
  "## 🧪 Testing",
  "## 🔗 Related",
];

/** How a `<!-- … -->` prompt is recognized in the template. */
export const TEMPLATE_COMMENT_PATTERN = /<!--[\S\s]*?-->/gu;

/**
 * How much of a template comment has to survive for it to count as unfilled.
 *
 * A prefix rather than the whole comment, because the point is to catch a
 * description that still carries the prompt, and a prompt with a word changed
 * in the middle of it is still the prompt. Long enough that no two prompts in
 * the template share one.
 */
export const TEMPLATE_COMMENT_PREFIX_LENGTH = 40;

/** Said when every heading is present and no prompt survived. */
export const BODY_VALID_MESSAGE = "✅ All required sections present";

/** Said when there is no description to check at all. */
export const BODY_MISSING_MESSAGE = "❌ Unable to determine Pull Request Body";

/** How the three failure lists are introduced. */
export const MISSING_HEADINGS_MESSAGE = "❌ Missing required sections:";
export const EMPTY_SECTIONS_MESSAGE = "❌ Empty required sections:";
export const UNFILLED_COMMENTS_MESSAGE =
  "❌ Unfilled template comments remain:";

/** The two closing lines, printed after either failure. */
export const BODY_GUIDANCE_LINES = [
  `PR description must include: ${REQUIRED_HEADINGS.join(", ")}, with every template comment replaced by real content.`,
  `See: ${PULL_REQUEST_TEMPLATE_PATH}`,
];

/** How to run this check, printed whenever the input could not be used. */
export const USAGE_LINES = [
  "Usage: validation pull-request-body <path-to-a-file-holding-the-body>",
  "   or: PULL_REQUEST_BODY=… validation pull-request-body",
];
