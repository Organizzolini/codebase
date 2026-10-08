// ♟️ Constants

import type { SectionRule, SectionShape } from "./pull-request-body.types";

/** The template every pull request description starts as. */
export const PULL_REQUEST_TEMPLATE_PATH = ".github/PULL_REQUEST_TEMPLATE.md";

/** The variable the workflow puts the description in. */
export const PULL_REQUEST_BODY_VARIABLE = "PULL_REQUEST_BODY";

/**
 * The four sections a description must carry, in the order they are reported,
 * with what each may hold and how long it may run.
 *
 * Read from here rather than from the template, deliberately: the headings are
 * the contract, and a template edit that dropped one should fail this check
 * rather than silently stop requiring it. The comments are the opposite case —
 * see `extractTemplateComments`. Only Summary and Details are capped, being
 * what a reviewer reads first: Summary to what reads at a glance, Details to
 * between the 90th and 95th percentiles of past descriptions. Words are counted as `wc -w`
 * would, once comments are removed.
 */
export const SECTION_RULES: readonly SectionRule[] = [
  { heading: "## 🌰 Summary", maximumWords: 48, shape: "paragraph" },
  { heading: "## 📝 Details", maximumWords: 512, shape: "bullet-list" },
  { heading: "## 🧪 Testing", shape: "ordered-list" },
  { heading: "## 🔗 Related", shape: "leading-dash-list" },
];

/** The four headings alone, as a description must carry them verbatim. */
export const REQUIRED_HEADINGS = SECTION_RULES.map((rule) => rule.heading);

/** How each shape is named in a failure and in the guidance. */
export const SECTION_SHAPE_DESCRIPTIONS: Readonly<
  Record<SectionShape, string>
> = {
  "bullet-list": "only a bulleted list, one marker throughout",
  "leading-dash-list": "a list whose items start with `-`, then anything",
  "ordered-list": "only an ordered list",
  paragraph: "only one plain paragraph",
};

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

/** How the five failure lists are introduced. */
export const MISSING_HEADINGS_MESSAGE = "❌ Missing required sections:";
export const EMPTY_SECTIONS_MESSAGE = "❌ Empty required sections:";
export const UNFILLED_COMMENTS_MESSAGE =
  "❌ Unfilled template comments remain:";
export const OVERSIZED_SECTIONS_MESSAGE = "❌ Sections over their word limit:";
export const MALFORMED_SECTIONS_MESSAGE =
  "❌ Sections not in their required shape:";

/** The closing lines, printed after any failure. */
export const BODY_GUIDANCE_LINES = [
  `PR description must include: ${REQUIRED_HEADINGS.join(", ")}, with every template comment replaced by real content.`,
  `Section shapes: ${SECTION_RULES.map(
    (rule) =>
      `${rule.heading.replace("## ", "")} holds ${SECTION_SHAPE_DESCRIPTIONS[rule.shape]}${rule.maximumWords === undefined ? "" : ` (at most ${String(rule.maximumWords)} words)`}`,
  ).join("; ")}.`,
  `See: ${PULL_REQUEST_TEMPLATE_PATH}`,
];

/** How to run this check, printed whenever the input could not be used. */
export const USAGE_LINES = [
  "Usage: validation pull-request-body <path-to-a-file-holding-the-body>",
  "   or: PULL_REQUEST_BODY=… validation pull-request-body",
];
