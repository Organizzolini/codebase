// ♟️ Constants

import type {
  CodometerAnalysis,
  CodometerCommentLanguage,
  CodometerCompression,
  CodometerDocumentationUnit,
  CodometerFormat,
  CodometerInput,
} from "./configuration.types";
import type { CodometerSeverity } from "@codometer/core";

/** Extensions the configuration loader can read. */
export const SUPPORTED_CONFIGURATION_EXTENSIONS = new Set([
  ".cjs",
  ".cts",
  ".js",
  ".json",
  ".jsonc",
  ".mjs",
  ".mts",
  ".ts",
]);

/**
 * File names searched for when no configuration path is given.
 *
 * Searched in order, so a repository carrying both a TypeScript and a JSON
 * configuration file gets the TypeScript one — the richer format, and the one
 * a type-checked configuration was written in.
 */
export const CONFIGURATION_FILE_NAMES = [
  "codometer.config.ts",
  "codometer.config.mts",
  "codometer.config.cts",
  "codometer.config.js",
  "codometer.config.mjs",
  "codometer.config.cjs",
  "codometer.config.json",
  "codometer.config.jsonc",
] as const;

/**
 * Path globs excluded from measurement when a configuration names none.
 *
 * Only the directories every ecosystem generates. Everything a specific
 * repository considers noise — ingested corpora, generated documentation,
 * scratch notes — belongs in that repository's own configuration file.
 */
export const DEFAULT_EXCLUDE_GLOBS = [
  "**/.nx/**",
  "**/build/**",
  "**/coverage/**",
  "**/dist/**",
  "**/node_modules/**",
] as const;

/**
 * Badge colors handed to configured counters that name none, in order.
 *
 * Cycled rather than exhausted, so a repository can configure as many counters
 * as it likes and each still gets a color that is stable between runs.
 */
export const DEFAULT_CUSTOM_STATISTIC_COLORS = [
  "7c3aed",
  "0284c7",
  "16a34a",
  "ea580c",
  "db2777",
  "0ea5e9",
  "059669",
  "ca8a04",
] as const;

/** Badge group a configured counter is rendered into when it names none. */
export const DEFAULT_CUSTOM_STATISTIC_GROUP = "conventions";

/**
 * Name of the input every run measures unless a configuration replaces it:
 * the codebase itself.
 *
 * Its files are every one the repository's ignore files leave behind rather
 * than a glob match — `include` here is a placeholder a glob-based reader
 * never consults for this one entry — which is what makes this input
 * different from every other one a configuration declares.
 */
export const DEFAULT_INPUT_NAME = "codebase";

/**
 * The built-in `codebase` input, present unless a configuration's `inputs`
 * names an entry of its own by that name.
 */
export const DEFAULT_CODEBASE_INPUT: CodometerInput = {
  analyses: ["language"],
  include: ["**/*"],
  name: DEFAULT_INPUT_NAME,
};

/**
 * Compression applied to an input that names none.
 *
 * Gzip rather than the best available, because a compressed size is only worth
 * measuring against what a server would actually send, and gzip is what every
 * client understands. An input measuring bytes on disk asks for `none`.
 */
export const DEFAULT_INPUT_COMPRESSION = "gzip" satisfies CodometerCompression;

/**
 * Where an input's globs start when it names no directory of its own.
 *
 * The process's working directory. An input that means to reach outside it
 * says so, which keeps "measure what I was pointed at" the thing that needs
 * no writing down.
 */
export const DEFAULT_INPUT_DIRECTORY = ".";

/**
 * Severity a limit that names none carries.
 *
 * The strict one. A limit is written to gate, so one that quietly warned
 * because nobody spelled out the severity would be a gate in name only —
 * `warn` is the deliberate choice, not the accidental one.
 */
export const DEFAULT_LIMIT_SEVERITY = "fail" satisfies CodometerSeverity;

/**
 * What each unit suffix a limit may carry multiplies its number by.
 *
 * Decimal rather than binary — `"8 KB"` is 8000 bytes — matching what every
 * size limit written against the tool this replaced already means. The
 * trailing `b` is part of every key, so `"8 K"` finds nothing here and is
 * rejected instead of being read as 8000 by a parser that shrugged.
 *
 * A map rather than an object literal, so that a unit spelling an inherited
 * property — `constructor` is the one the pattern can reach — finds nothing
 * either, instead of a function that multiplies the limit into `NaN` and
 * quietly stops it ever being exceeded.
 */
export const LIMIT_UNIT_MULTIPLIERS: ReadonlyMap<string, number> = new Map([
  ["b", 1],
  ["gb", 1_000_000_000],
  ["kb", 1_000],
  ["mb", 1_000_000],
  ["tb", 1_000_000_000_000],
]);

/**
 * Splits a limit written as a string into its number and its unit.
 *
 * Anchored at both ends so a value with anything else in it — a comparison, a
 * second number, a trailing word — matches nothing and is rejected rather than
 * being read as whichever part happened to parse.
 */
export const LIMIT_VALUE_PATTERN = /^(\d+(?:\.\d+)?)\s*([a-z]*)$/i;

/** Spaces used to indent the JSON report when a configuration names none. */
export const DEFAULT_JSON_INDENTATION = 2;

/** Closing marker of the generated badge block. */
export const DEFAULT_MARKDOWN_END_MARKER = "<!-- codometer:end -->";

/** Opening marker of the generated badge block. */
export const DEFAULT_MARKDOWN_START_MARKER = "<!-- codometer:start -->";

/**
 * Interpreter used for Python analysis when a configuration names none.
 *
 * A repository whose Python lives in a managed environment overrides this with
 * the command that enters it — `uv run python`, `poetry run python`, or the
 * path to a virtual environment's interpreter.
 */
export const DEFAULT_PYTHON_COMMAND = "python3";

/**
 * Prefix that turns an include glob into one that removes files instead.
 *
 * Read wherever an input's globs are resolved, so the negations end up in the
 * exclude set rather than being matched literally against a path no file
 * starts with.
 */
export const NEGATION_PREFIX = "!";

/**
 * Marks the repository root during an upward search from the process cwd.
 *
 * A package manifest is deliberately not one of them: every package in a
 * monorepo carries one, so the search would stop at the nearest project rather
 * than the root a configuration path was written relative to.
 */
export const REPOSITORY_ROOT_MARKERS = [".git", "pnpm-workspace.yaml"] as const;

/** Analyses an input may ask to have run over it. */
export const CODOMETER_ANALYSES = [
  "language",
  "size",
] as const satisfies readonly CodometerAnalysis[];

/** Languages a `comment` selector may narrow itself to. */
export const CODOMETER_COMMENT_LANGUAGES = [
  "css",
  "hcl",
  "python",
  "shell",
  "sql",
  "toml",
  "typescript",
  "yaml",
] as const satisfies readonly CodometerCommentLanguage[];

/** Compressions an input may ask its size to be measured under. */
export const CODOMETER_COMPRESSIONS = [
  "brotli",
  "gzip",
  "none",
] as const satisfies readonly CodometerCompression[];

/**
 * What a configuration reaching no `format` is told — written out rather than
 * left as the schema's own "expected one of" line, because it is the first
 * thing a newcomer to codometer sees.
 */
export const MISSING_FORMAT_MESSAGE =
  'A codometer configuration must name a `format` of "json" or "markdown", and nothing supplies one for it. Set it in this file, or spread a shared default object that sets it — every run has to be told which report shape it produces, and a directory with no configuration file anywhere above it fails here rather than measuring with a format nobody chose.';

/** Report shapes a run may produce. */
export const CODOMETER_FORMATS = [
  "json",
  "markdown",
] as const satisfies readonly CodometerFormat[];

/** Units a documentation limit may measure a comment's length in. */
export const CODOMETER_DOCUMENTATION_UNITS = [
  "characters",
  "lines",
  "words",
] as const satisfies readonly CodometerDocumentationUnit[];
