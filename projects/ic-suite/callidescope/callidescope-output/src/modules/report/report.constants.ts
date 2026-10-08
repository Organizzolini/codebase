// ♟️ Constants

/** Marks the first frame of a printed call stack. */
export const ENTRY_FRAME_PREFIX = "🚀";

/** Marks every frame below the first. */
export const NESTED_FRAME_PREFIX = "└─>";

/**
 * Characters of signature a frame prints before it collapses the parameters.
 *
 * Most signatures here are short — the median is under twenty characters — but
 * a NestJS constructor taking a dozen injected services runs past four hundred,
 * and one of those inside an indented stack destroys the shape that makes the
 * stack readable at all.
 */
export const SIGNATURE_LIMIT = 80;

/** Stands in for a parameter list too long to print. */
export const COLLAPSED_PARAMETERS = "(…)";

/**
 * Characters of documentation prose a printed frame keeps.
 *
 * A summary is meant to orient a reader mid-stack, not to replace opening the
 * file, and a paragraph indented under ten frames is worse than a sentence.
 * Only the tree is bound by this — the JSON report carries the whole comment.
 */
export const SUMMARY_LIMIT = 120;

/**
 * Ends a sentence, when the next one starts.
 *
 * A capital after the space is what separates a sentence break from `e.g. the`
 * or a dotted identifier, neither of which ends anything.
 */
export const SENTENCE_END_PATTERN = /[!.?](?=\s+[A-Z])/;

/** Appended to a summary cut mid-thought. */
export const TRUNCATION_SUFFIX = "…";

/** Marks a frame whose callable is on its way out. */
export const DEPRECATED_MARKER = "⚠ deprecated";

/** Introduces the documentation line printed under a frame. */
export const SUMMARY_PREFIX = "↳";

/**
 * Opens every diagram.
 *
 * Left to right, because that is the direction a stack reads and the direction
 * a wide, shallow call graph fits a page.
 */
export const MERMAID_FLOWCHART_HEADER = "flowchart LR";

/**
 * Callables a diagram draws before it stops accepting stacks.
 *
 * GitHub refuses a mermaid block past 50,000 characters, and at roughly fifty
 * characters per node and edge this leaves room to spare — the widest project
 * here draws 263. Whole stacks are dropped rather than trimmed, so the diagram
 * never shows an edge into a callable it does not draw.
 */
export const MAXIMUM_DIAGRAM_NODES = 300;

/** Prefix of every generated node identifier. */
export const DIAGRAM_NODE_PREFIX = "n";

/** What mermaid would read as syntax inside a node label. */
export const MERMAID_LABEL_ESCAPES: ReadonlyMap<string, string> = new Map([
  ["<", "#lt;"],
  [">", "#gt;"],
  ['"', "#quot;"],
]);

/** Header of the run or project summary table. */
export const MARKDOWN_SUMMARY_HEADER = "| Measure | Value |\n| --- | --- |";

/** Header of the breadth table. */
export const MARKDOWN_WIDE_CALLABLES_HEADER =
  "| Callable | Breadth | Calls directly | Location |\n| --- | --- | --- | --- |";

/**
 * Heading over the call stacks that ran deeper than their project allows.
 *
 * A constant rather than a literal because two renderings write it — the
 * whole-run report, and the findings-only rendering a gate prints — and a
 * reader who greps a failed pipeline for one of them must find the other.
 */
export const MARKDOWN_DEEP_STACKS_HEADING = "Call stacks over the depth limit";

/** Heading over the callables that called more directly than allowed. */
export const MARKDOWN_WIDE_CALLABLES_HEADING =
  "Callables over the breadth limit";

/** Stands in for the workspace root when it is itself a traced project. */
export const ROOT_PROJECT_LABEL = ".";

/** Header of the per-project index table. */
export const MARKDOWN_PROJECT_INDEX_HEADER =
  "| Project | Deepest | Limit | Headroom | Widest |\n| --- | --- | --- | --- | --- |";

/** Header of the depth-headroom scoreboard. */
export const MARKDOWN_HEADROOM_HEADER =
  "| Headroom | Projects |\n| --- | --- |";

/** Heading over the limits one project's own section is judged against. */
export const MARKDOWN_PROJECT_LIMITS_HEADING = "Limits";

/**
 * Header of a project's own resolved-limits table.
 *
 * Two columns rather than the `limits` command's three: that listing spans
 * every project and has to name the file each number came from, where here
 * there is only one file it could be — the `callidescope.config.ts` beside this
 * very readme — and naming it would mean carrying an absolute path, which is
 * not a thing a committed file can hold.
 */
export const MARKDOWN_PROJECT_LIMITS_HEADER =
  "| Limit | Value |\n| --- | --- |";

/**
 * Says where the numbers come from, so the table needs no second reading.
 *
 * Worded as the `limits` command words it, because the two answer the same
 * question at two scopes — one project's block and the whole set — and a
 * reader who learns the vocabulary in one should not have to learn it again in
 * the other.
 */
export const MARKDOWN_PROJECT_LIMITS_SUMMARY =
  "What this project is judged against, as declared in its own `callidescope.config.ts`.";

/**
 * The two gated limits, in the order a project's block prints them.
 *
 * Depth first because depth is judged always and breadth only where a limit
 * exists, so the first row is the one every project has an answer for.
 */
export const MARKDOWN_PROJECT_LIMIT_NAMES = [
  "maximumDepth",
  "maximumBreadth",
] as const;

/**
 * What a value cell says when nothing anywhere declares the limit.
 *
 * Breadth has no workspace default and no tool default, so a project that
 * declares none is gated by nothing at all — and printing a number here, the
 * workspace's or an invented one, would say the opposite.
 */
export const NO_LIMIT_LABEL = "none";

/** Bucket holding the projects whose deepest stack broke their own limit. */
export const HEADROOM_BUCKET_OVER_LIMIT = "over limit";

/** Bucket holding the projects sitting exactly on their own limit. */
export const HEADROOM_BUCKET_AT_LIMIT = "0 — at limit";

/** Bucket holding the projects one frame from their own limit. */
export const HEADROOM_BUCKET_ONE = "1";

/** Bucket holding the projects two or three frames from their own limit. */
export const HEADROOM_BUCKET_TWO_TO_THREE = "2–3";

/** Bucket holding the projects with room to spare. */
export const HEADROOM_BUCKET_FOUR_PLUS = "4+";

/**
 * Bucket holding the projects that measured no stack at all.
 *
 * Named rather than folded into the widest headroom bucket: a project whose
 * deepest stack is zero is not a project with room to spare, it is a project
 * whose limit gates nothing, and those are opposite findings.
 */
export const HEADROOM_BUCKET_UNMEASURED = "no stacks";

/**
 * The order the scoreboard prints its buckets in, tightest first.
 *
 * A fixed list rather than the keys a run happened to produce, so a bucket
 * nothing fell into is still printed as a zero. "Nothing is over its limit" is
 * the row a reader came for, and an absent row cannot say it.
 */
export const HEADROOM_BUCKET_ORDER = [
  HEADROOM_BUCKET_OVER_LIMIT,
  HEADROOM_BUCKET_AT_LIMIT,
  HEADROOM_BUCKET_ONE,
  HEADROOM_BUCKET_TWO_TO_THREE,
  HEADROOM_BUCKET_FOUR_PLUS,
  HEADROOM_BUCKET_UNMEASURED,
] as const;
