// 🏷️ Types

/**
 * Aggregated code statistics produced by the measurement pipeline,
 * grouped by the language each counter was measured from.
 *
 * This is the shape every configured callback is handed, which is why it lives
 * beside the configuration types rather than in the CLI that produces it: a
 * `codometer.config.ts` has to be able to name it.
 */
export interface CodeStatisticsResult {
  css: CssStatistics;
  custom: CustomStatisticResult[];
  folders: number;
  hcl: HclStatistics;
  javascript: JavascriptStatistics;
  json: JsonStatistics;
  jupyter: JupyterStatistics;
  linesOfCode: number;
  markdown: MarkdownStatistics;
  python: PythonStatistics;
  /**
   * Byte-precise total of this target's files, uncompressed.
   *
   * Produced by the same size analysis a declared target's `size` metric
   * uses — with `none` as its compression — rather than a rounded stat sum,
   * so the workspace headline moves by the byte instead of by the whole
   * binary unit and stays comparable with every other size in the workspace,
   * which are all decimal.
   */
  repositoryBytes: number;
  shell: ShellStatistics;
  sourceFiles: number;
  sql: SqlStatistics;
  toml: TomlStatistics;
  typescript: TypescriptStatistics;
  yaml: YamlStatistics;
}

/**
 * Everything one run measured, and everything it could not.
 *
 * Codometer's own shape rather than any other tool's. What a consumer needs is
 * every metric's value alongside whatever limits it, and a name it can join a
 * previous run's report on; nothing here is inferred from a field's absence.
 */
export interface CodometerReport {
  /**
   * Whatever the run could not do, named. Empty on an ordinary run.
   *
   * Present in the report rather than only on the console so that a consumer
   * reading the file can tell a metric nobody measured from one that measured
   * zero.
   */
  failures: ReportFailure[];
  targets: ReportTarget[];
}

/**
 * What a breach costs.
 *
 * `fail` is a gate and `warn` is a report — the difference between a limit
 * that stops a change and one that only says the metric passed it. Both are
 * reported identically; only the consequence differs.
 */
export type CodometerSeverity = "fail" | "warn";

/**
 * A badge group a configured counter can be rendered into.
 *
 * Every group the report renders, plus `conventions` — the group that exists
 * for these counters and appears only when at least one is configured.
 */
export type CodometerStatisticGroup =
  | "conventions"
  | "css"
  | "hcl"
  | "json"
  | "jupyter"
  | "markdown"
  | "python"
  | "repository"
  | "shell"
  | "sql"
  | "toml"
  | "typescript"
  | "yaml";

/**
 * A kind of declaration a symbol counter can ask for.
 *
 * `function` covers every callable written outside a class body — function
 * declarations, function expressions, and arrow functions alike — while a
 * callable written as a class member is a `method`, a `getter`, or a
 * `setter`. A class field holding an arrow function is a `property`: the
 * arrow carries none of the field's modifiers, so a static one is found by
 * asking for static properties rather than static methods.
 */
export type CodometerSymbolKind =
  | "class"
  | "enum"
  | "function"
  | "getter"
  | "interface"
  | "method"
  | "property"
  | "setter";

/**
 * A modifier a counted declaration must carry.
 *
 * Read literally, from the syntax: `public` matches members annotated
 * `public` and not members that are public by omission, and `private`
 * likewise does not match a `#name` field, which carries no modifier.
 */
export type CodometerSymbolModifier =
  | "abstract"
  | "async"
  | "export"
  | "override"
  | "private"
  | "protected"
  | "public"
  | "readonly"
  | "static";

/**
 * Structural statistics specific to CSS stylesheets.
 */
export interface CssStatistics {
  atRules: number;
  comments: number;
  customProperties: number;
  declarations: number;
  files: number;
  lines: number;
  mediaQueries: number;
  rules: number;
  selectors: number;
}

/**
 * What one configured counter found.
 *
 * `count` is files for a counter matching paths and declarations for one
 * matching symbols, which is why it is not called either.
 */
export interface CustomStatisticResult {
  color: string;
  count: number;
  group: CodometerStatisticGroup;
  /**
   * Where each measured instance was found, for a selector that measures
   * per-instance rather than only counting matches.
   *
   * Left unset by a counter that only counts — `patterns`, `symbols` — since
   * neither measures anything beyond a match. A `comment` selector populates
   * it with every block that broke its budget.
   */
  instances?: CustomStatisticResultInstance[] | undefined;
  label: string;
}
// 🏷️ Types

// What a measurement produces, as opposed to what a configuration asks
// for. This half imports nothing, so the authoring vocabulary can read it
// without the two sides forming a cycle.

/** One measured occurrence a per-instance selector found. */
export interface CustomStatisticResultInstance {
  file: string;
  /** 1-indexed line the measured thing starts on. */
  line: number;
  measured: number;
}

/**
 * Statistics specific to HCL, the Terraform configuration language.
 */
export interface HclStatistics {
  attributes: number;
  blocks: number;
  comments: number;
  files: number;
  interpolations: number;
  lines: number;
  outputs: number;
  resources: number;
  variables: number;
}

/** Code statistics specific to JavaScript source files. */
export interface JavascriptStatistics {
  asyncFunctions: number;
  classes: number;
  commentLines: number;
  comments: number;
  constants: number;
  exported: number;
  externalPackages: number;
  files: number;
  functions: number;
  imports: number;
  methods: number;
  syncFunctions: number;
  testFiles: number;
  todos: number;
}

/** Code statistics specific to JSON, JSONC, and JSONL files. */
export interface JsonStatistics {
  arrays: number;
  booleans: number;
  files: number;
  items: number;
  lines: number;
  maxDepth: number;
  nulls: number;
  numbers: number;
  objects: number;
  properties: number;
  strings: number;
  totalNodes: number;
}

/**
 * Statistics specific to Jupyter notebooks.
 *
 * A notebook is three languages in one file, so the counters come from three
 * analyzers: the notebook document itself is JSON, its code cells are Python,
 * and its markdown cells are prose. Cell and output counts are the notebook's
 * own, belonging to no single language.
 */
export interface JupyterStatistics {
  cells: number;
  classes: number;
  codeBlocks: number;
  codeCells: number;
  codeLines: number;
  decorators: number;
  executedCells: number;
  files: number;
  functions: number;
  headings: number;
  images: number;
  imports: number;
  links: number;
  markdownCells: number;
  markdownLines: number;
  maxDepth: number;
  outputs: number;
  properties: number;
  rawCells: number;
  totalNodes: number;
}

/** Structural statistics specific to markdown documents. */
export interface MarkdownStatistics {
  blockQuotes: number;
  codeBlocks: number;
  files: number;
  headingLevel1: number;
  headingLevel2: number;
  headingLevel3: number;
  headingLevel4: number;
  headingLevel5: number;
  headingLevel6: number;
  images: number;
  inlineCode: number;
  lines: number;
  links: number;
  listItems: number;
  lists: number;
  paragraphs: number;
  tableRows: number;
  tables: number;
  taskListItems: number;
  thematicBreaks: number;
}

/**
 * What a metric's number counts.
 *
 * Only bytes are called out. Every other metric counts things, and a count has
 * no unit to get wrong.
 */
export type MetricUnit = "bytes" | null;

/** Code statistics specific to Python source files. */
export interface PythonStatistics {
  classes: number;
  commentLines: number;
  comments: number;
  constants: number;
  decorators: number;
  docstringLines: number;
  docstrings: number;
  files: number;
  functions: number;
  imports: number;
  lines: number;
  protocols: number;
}

/**
 * Something the run could not do, and what it was trying to do it to.
 *
 * Declared beside the measurement that produces it rather than beside the
 * report that renders it, so the dependency between the two runs one way. The
 * name says where it surfaces: `CodometerReport.failures` is what a consumer
 * reads it from.
 */
export interface ReportFailure {
  /** Which part of the run it failed in. */
  kind: ReportFailureKind;
  reason: string;
  /** An input's name for an input failure, a limit's written path for a limit. */
  subject: string;
}

/**
 * Which part of a run a failure belongs to.
 *
 * `input` is a set of files that could not be measured; `limit` is a declared
 * limit that could not be held against anything. Neither is a breach, and a
 * consumer that treats them as one reports a passing gate for a metric nobody
 * ever measured.
 */
export type ReportFailureKind = "input" | "limit";

/**
 * The limit declared on one metric, and whether the metric cleared it.
 *
 * A limit that held is written out exactly like one that did not, so a
 * consumer can render the headroom rather than only the failures.
 */
export interface ReportLimit {
  breached: boolean;
  /** Stays `null` when none was written; a renderer falls back to the path. */
  label: null | string;
  severity: CodometerSeverity;
  value: number;
}

/** One measured number, and whatever limits it. */
export interface ReportMetric {
  /**
   * Where each measured instance was found, for a metric a per-instance
   * selector produced — a `comment` selector today, and any future selector
   * that measures more than a count.
   *
   * Stays `null` for a metric that only counts, so a consumer can tell "no
   * instance was found" from "this metric never tracks instances" without
   * reading the configuration that produced it — the same reasoning
   * `ReportLimit.label` already follows for a limit nobody named.
   */
  instances: CustomStatisticResultInstance[] | null;
  /**
   * Every limit declared on the metric, in the order they were written.
   *
   * A list because the configuration accepts more than one limit on a single
   * metric on purpose — a `warn` short of a `fail` is how a repository sees a
   * number coming before it stops a change — and the gate already enforces all
   * of them. A single field could only carry the last one written, which made
   * the report unable to say what the gate was actually enforcing.
   *
   * Stays an empty array where nothing limits the metric, never absent.
   */
  limits: ReportLimit[];
  /**
   * The metric's name across runs: its target's name, then its path.
   *
   * Stable by construction — both halves are written in the configuration —
   * which is what lets a consumer join this run's report against the last
   * one's instead of reading every metric as removed and re-added.
   */
  name: string;
  /** The metric's path within its target, with no target name on the front. */
  path: string;
  /**
   * `bytes` where the value counts bytes, `null` for a plain count.
   *
   * Bytes are raw and decimal: a renderer showing kilobytes divides by 1000.
   */
  unit: MetricUnit;
  value: number;
}

/** One target's metrics, and whether its globs claimed anything at all. */
export interface ReportTarget {
  /**
   * True when the target's globs matched no files.
   *
   * Said outright rather than left to be read off a missing limit or a zero,
   * because a target that matched nothing passes every limit written against
   * it while measuring nothing at all.
   */
  empty: boolean;
  /** How many files the target's globs claimed. */
  files: number;
  metrics: ReportMetric[];
  name: string;
}

/**
 * Statistics specific to shell scripts.
 *
 * Counted with patterns rather than a parser: shell has no portable syntax
 * tree available without a native dependency, so these are the constructs a
 * reader recognizes on sight rather than everything the language admits.
 */
export interface ShellStatistics {
  commentLines: number;
  comments: number;
  conditionals: number;
  exports: number;
  files: number;
  functions: number;
  lines: number;
  loops: number;
  pipelines: number;
  shebangs: number;
  variables: number;
}

/**
 * Statistics specific to SQL scripts.
 */
export interface SqlStatistics {
  comments: number;
  commonTableExpressions: number;
  creates: number;
  deletes: number;
  files: number;
  inserts: number;
  joins: number;
  lines: number;
  selects: number;
  statements: number;
  updates: number;
}

/**
 * Structural statistics specific to TOML documents.
 */
export interface TomlStatistics {
  arrays: number;
  arrayTables: number;
  comments: number;
  files: number;
  keys: number;
  lines: number;
  tables: number;
}
// 🏷️ Types

/** Code statistics specific to TypeScript source files. */
export interface TypescriptStatistics {
  decorators: number;
  docComments: number;
  enums: number;
  files: number;
  genericDeclarations: number;
  interfaces: number;
}

/**
 * Structural statistics specific to YAML documents.
 *
 * A YAML file is a stream rather than a single value: one file can hold
 * several documents, which is why `documents` is counted apart from `files`.
 */
export interface YamlStatistics {
  aliases: number;
  anchors: number;
  comments: number;
  documents: number;
  files: number;
  keys: number;
  lines: number;
  mappings: number;
  maxDepth: number;
  scalars: number;
  sequences: number;
}
