// 🏷️ Types

import type { FORMAT_NAMES } from "./configuration-flags.constants";
import type { WriteMarkdownOutput } from "./output.types";
import type {
  CodometerSeverity,
  CodometerStatisticGroup,
  CodometerSymbolKind,
  CodometerSymbolModifier,
} from "@codometer/core";

/**
 * An analysis codometer can run over an input.
 *
 * `language` parses the matched files and counts what they declare; `size`
 * compresses them and counts bytes. Which of them an input runs is the only
 * thing separating a source tree from build output.
 */
export type CodometerAnalysis = "language" | "size";

/**
 * A language a `comment` custom-statistic selector may narrow itself to.
 *
 * The same eight languages that used to carry their own `comments` override:
 * every language this tool reads comments from except the JSDoc-style
 * documentation a `kind` narrows to, which is not tied to one language.
 */
export type CodometerCommentLanguage =
  | "css"
  | "hcl"
  | "python"
  | "shell"
  | "sql"
  | "toml"
  | "typescript"
  | "yaml";

/**
 * One comment measured against the limit its kind carries.
 *
 * Shared by every analyzer that measures comment length, so a JSDoc block and
 * a YAML comment block reach the report through one channel and render with
 * one line of markdown. `kind` is a plain string for that reason: a symbol
 * kind and a comment kind are both written into it, and narrowing it here
 * would make the union the property of whichever analyzer was added first.
 */
export interface CodometerCommentMeasurement {
  breached: boolean;
  /** What the comment documents: a declaration's name, or the comment itself. */
  declaration: string;
  file: string;
  kind: string;
  limit: number;
  /** 1-indexed line the measured thing starts on. */
  line: number;
  measured: number;
  severity: CodometerSeverity;
  unit: CodometerDocumentationUnit;
}

/**
 * Selects a comment budget for a `CodometerCustomStatistic` to measure.
 *
 * A matching custom statistic's `value` counts the blocks that broke this
 * selector's own maxima, and its `instances` names each one's file and line.
 * No selector inherits from another: a general budget and a narrower
 * exception are both written out in full, rather than one merging over the
 * other.
 *
 * Omitting `language` applies the budget to every language that has comments.
 * Naming `kind` narrows the budget to a documented declaration's JSDoc-style
 * comment for that kind, rather than a plain comment block.
 */
export interface CodometerCommentSelector {
  kind?: CodometerSymbolKind | undefined;
  language?: CodometerCommentLanguage | undefined;
  /** How many characters a block may hold, markers and newlines and all. */
  maximumCharacters?: number | undefined;
  /** How many lines a block may span. */
  maximumLines?: number | undefined;
  /** How many words of prose a block may hold, once markers are stripped. */
  maximumWords?: number | undefined;
  /** How loudly a breach is reported. Defaults to `fail`, as limits do. */
  severity?: CodometerSeverity | undefined;
}

/**
 * How a target's files are compressed before size analysis counts them.
 *
 * `none` reports the bytes on disk. Named explicitly rather than inferred from
 * which options are absent, because a compression nobody chose is a byte count
 * nobody can explain.
 */
export type CodometerCompression = "brotli" | "gzip" | "none";

/**
 * Configuration authored in a `codometer.config.ts` file.
 *
 * Every field but `format` is optional, so a repository can leave its
 * exclusions and output destinations unwritten until it has decided what they
 * should be. `format` is the one thing every run must be told, and there is no
 * built-in fallback for it — so a directory with no configuration file
 * anywhere above it does not measure at all: it fails on the missing `format`
 * exactly as a file that forgot to write one does. A shared default object,
 * spread by each project's own file, is how a workspace states it once.
 */
export interface CodometerConfiguration {
  /**
   * Every counter this configuration measures, regardless of where — or
   * whether — any of them is rendered.
   *
   * Declaring a counter here is what measures it; an `outputs[].custom` entry
   * then only *selects* which of these labels that destination renders. A
   * label an output selects that is not declared here is refused: selection
   * cannot conjure a counter that was never measured.
   */
  custom?: CodometerCustomStatistic[] | undefined;
  /**
   * Input an unqualified limit's metric path belongs to.
   *
   * A limit addresses its metric by input name followed by metric path.
   * Naming a default lets the input that dominates a repository's limits go
   * unwritten, leaving `typescript.interfaces` where every line would
   * otherwise repeat the same input name. A path that could be read either
   * way is rejected rather than resolved, so the shorthand can never bind
   * somewhere unintended.
   */
  defaultInput?: string | undefined;
  exclude?: string[] | undefined;
  /**
   * Ignore files, in gitignore syntax, whose patterns also exclude files.
   *
   * For the committed-but-generated files no glob list should have to restate —
   * lockfiles, vendored bundles, anything a repository already tells its other
   * tools to skip. Files the repository's own `.gitignore` claims need no
   * mention at all: discovery reads those files itself.
   */
  excludeFrom?: string[] | undefined;
  /**
   * Which report shape a run produces.
   *
   * Required, with no code-level fallback: a shared default object — spread
   * by every project's own `codometer.config.ts` — is what sets it once for a
   * workspace, and a configuration reaching neither it nor its own value
   * fails to resolve rather than silently picking one.
   */
  format: CodometerFormat;
  /**
   * Named sets of files measured alongside — or instead of — the codebase.
   *
   * A built-in entry named `codebase` — the whole-tree scan, running the
   * `language` analysis — is always present unless this array declares an
   * entry of its own by that name, which replaces it outright. A
   * configuration declaring no `inputs` at all gets exactly that built-in
   * entry and nothing else, which is today's implicit whole-tree behavior.
   */
  inputs?: CodometerInput[] | undefined;
  /**
   * How high each measured metric may go.
   *
   * A metric nothing here names is measured and reported like every other one,
   * and gated by nothing.
   */
  limits?: CodometerLimit[] | undefined;
  /**
   * Destinations the measured statistics are written to.
   *
   * An array of typed entries rather than a fixed-key object, so each entry
   * carries its own `custom` counters independently of every other one.
   *
   * At most one entry per `type`: a second entry of a kind is refused rather
   * than silently ignored, because `--output-json [path]` and
   * `--output-markdown [path]` each name one path, so nothing on the command
   * line could ever address a second destination of the same kind.
   */
  outputs?: CodometerOutput[] | undefined;
  python?: CodometerPythonConfiguration | undefined;
}

/**
 * One configured counter.
 *
 * A counter measures one of three things. With `patterns` alone it counts
 * *files* whose repository-relative path matches at least one glob. With
 * `symbols` it counts *declarations* in TypeScript and JavaScript sources
 * matching the AST criteria, and `patterns` then narrows which files are
 * searched rather than being what is counted. With `comment` it counts
 * *comment blocks* that broke the selector's own budget, instead of files or
 * declarations.
 *
 * Either way a match is counted once, however many patterns claim it.
 */
export interface CodometerCustomStatistic {
  /** Badge color, as a shields.io hexadecimal triplet. */
  color?: string | undefined;
  comment?: CodometerCommentSelector | undefined;
  /**
   * Which badge group the counter is rendered into.
   *
   * Defaults to `conventions`, the group that exists for these counters and
   * is omitted entirely when none are configured. Naming a language group
   * instead puts the badge beside the built-in counters it belongs with.
   */
  group?: CodometerStatisticGroup | undefined;
  label: string;
  patterns?: string[] | undefined;
  symbols?: CodometerSymbolMatcher | undefined;
}

/** Unit a documentation length is measured in. */
export type CodometerDocumentationUnit = "characters" | "lines" | "words";

/** Which report shape a run produces. */
export type CodometerFormat = "json" | "markdown";

/**
 * A named set of files, declared by include and exclude globs.
 *
 * Globs are relative to `directory`, which itself is relative to the
 * process's working directory — not to the configuration file's own
 * directory — and a leading `!` on an include glob excludes instead of
 * including. Negations are collected rather than applied in order, so moving
 * one within the array cannot change which files the input holds.
 *
 * Ignore files are not consulted, except for the entry named `codebase`,
 * whose files are every one the repository's ignore files leave behind
 * rather than a glob match. An entry declared under that name replaces the
 * built-in one, which is what lets a repository measure the whole tree under
 * a compression or a different set of analyses — but only its `compression`
 * and `analyses` are read. Its `include` and `exclude` globs are not
 * consulted at all, because the whole-tree scan is discovered by ignore-file
 * walking rather than by matching globs; to measure a subset of the tree,
 * declare an input under some other name.
 */
export interface CodometerInput {
  /** Which analyses run over the matched files. At least one. */
  analyses: CodometerAnalysis[];
  compression?: CodometerCompression | undefined;
  /**
   * Where the input's globs start, relative to the process's working
   * directory.
   *
   * Defaults to the working directory itself. A repository that builds into
   * one tree while measuring a project in another names the way out here —
   * `"../.."` for a project two levels down from a workspace-level `dist` —
   * so that codometer never has to know a build output convention to find the
   * files an input claims.
   */
  directory?: string | undefined;
  exclude?: string[] | undefined;
  include: string[];
  name: string;
}

/**
 * Where and how the JSON statistics report is written.
 *
 * `custom` selects, by label, which of the top-level `custom` counters this
 * destination renders — independently of any other output's own selection.
 * Selecting a label the top level never declared is refused.
 */
export interface CodometerJsonOutput {
  custom?: string[] | undefined;
  indentation?: number | undefined;
  path: string;
  type: "json";
}

/**
 * How high one measured metric may go.
 *
 * Limits are absolute: the metric is compared against `value` and nothing
 * else, with no baseline and no floor. A metric that stays under its limit is
 * reported the same way it would be without one.
 */
export interface CodometerLimit {
  /** What to call the limit in a report, when the path itself reads poorly. */
  label?: string | undefined;
  /**
   * The metric this limits, as a dotted path.
   *
   * Written as the input's name followed by the metric's path within it —
   * `codebase.typescript.interfaces`, `codebase.markdown.files`, or
   * `Compiled JavaScript.size`. With a `defaultInput` configured, a path
   * naming no input is read as that input's. A path that resolves to more
   * than one metric, or to none, fails the run rather than binding to
   * whichever came first.
   */
  metric: string;
  /**
   * How loudly a breach is reported. Defaults to `fail`.
   *
   * Defaulted to the strict one on purpose: a limit exists to gate, and one
   * that quietly warned because nobody said otherwise would be a gate in name
   * only.
   */
  severity?: CodometerSeverity | undefined;
  /**
   * How high the metric may go, as a number or a string carrying a unit.
   *
   * Units are decimal and their trailing `b` is required: `"8 KB"` is 8000 and
   * `"1 MB"` is 1000000, while `"8 K"` is not a size and is rejected. A value
   * nothing can read fails the run rather than being taken as zero, which
   * would gate every metric at nothing.
   */
  value: number | string;
}

/**
 * Where and how the markdown report is written.
 *
 * `write` is the whole of the customizable behavior: it turns the measured
 * statistics into markdown and decides which file that markdown lands in and
 * how, replacing what used to be two separate callbacks. Leaving it unset
 * keeps the built-in rendering and writing.
 *
 * `path` is optional because a `write` function may choose the file itself —
 * but one of the two must be present, or there is no markdown output at all.
 * `custom` selects, by label, which of the top-level `custom` counters this
 * destination renders — independently of any other output's own selection.
 * Selecting a label the top level never declared is refused.
 */
export interface CodometerMarkdownOutput {
  custom?: string[] | undefined;
  description?: string | undefined;
  endMarker?: string | undefined;
  path?: string | undefined;
  startMarker?: string | undefined;
  type: "markdown";
  write?: undefined | WriteMarkdownOutput;
}

/** Destination the measured statistics are written to, one report shape each. */
export type CodometerOutput = CodometerJsonOutput | CodometerMarkdownOutput;

/** How Python sources are analyzed. */
export interface CodometerPythonConfiguration {
  command?: string | undefined;
}

/**
 * Which TypeScript and JavaScript declarations a counter claims.
 *
 * A declaration counts when its kind is one of `kinds` and it carries every
 * modifier in `modifiers`. An empty or absent `modifiers` asks for the kind
 * alone.
 */
export interface CodometerSymbolMatcher {
  kinds: CodometerSymbolKind[];
  modifiers?: CodometerSymbolModifier[] | undefined;
}

/** Arguments accepted when loading a configuration file. */
export interface LoadConfigurationArguments {
  configurationPath?: string | undefined;
  searchDirectory?: string | undefined;
}

/**
 * Options accepted by the measure command.
 *
 * `--output-json` and `--output-markdown` are each independent: passing one
 * never implicitly writes the other, and neither implies `--check reports`.
 * There is no `--write` — passing an `--output-*` flag at all is what makes
 * this run produce that destination.
 */
export interface MeasureCommandOptions {
  /** The comma-separated set of things to fail on, as it was written. */
  check?: string | true | undefined;
  config?: string | undefined;
  /** What to print to standard output, as it was written. */
  format?: string | undefined;
  /**
   * The glob array that replaces every configured input for this run, as
   * written. `undefined` when the flag was never passed at all.
   */
  inputs?: string[] | undefined;
  /**
   * The report's destination, as it was written.
   *
   * `true` for a bare flag naming no path, a string for an explicit one, and
   * `undefined` when the flag was never passed.
   */
  outputJson?: string | true | undefined;
  /**
   * The markdown destination, as it was written.
   *
   * `true` for a bare flag naming no path, a string for an explicit one, and
   * `undefined` when the flag was never passed.
   */
  outputMarkdown?: string | true | undefined;
}

/**
 * What a run prints to standard output, when it prints anything.
 *
 * Derived from the list `--format` is validated against, so a format added
 * there is one this accepts rather than two lists to keep in step.
 */
export type MeasureFormat = (typeof FORMAT_NAMES)[number];

/**
 * What the command line asked the run to do, and what it could not make sense
 * of.
 *
 * Every complaint is collected before any of them is reported, so a command
 * line with two mistakes in it is two mistakes to fix rather than two runs.
 */
export interface ModeSelection {
  errors: string[];
  mode: RunMode;
}

/**
 * What the run does with what it measures.
 *
 * Checking staleness gates on `checksReports` alone and a breach on
 * `checksLimits` alone. Writing is answered per output: `writesJson` and
 * `writesMarkdown` are each true only when that output's own `--output-*`
 * flag was passed, so no flag ever quietly writes a destination the command
 * line never named.
 */
export interface RunMode {
  checksLimits: boolean;
  checksReports: boolean;
  writesJson: boolean;
  writesMarkdown: boolean;
}
