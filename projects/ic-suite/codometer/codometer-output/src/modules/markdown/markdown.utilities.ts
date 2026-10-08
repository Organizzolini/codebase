// 🛠️ Utilities

import { formatBytes } from "../render/render.utilities";

import type { MeasurementScope, TargetSize } from "./markdown.types";
import type {
  CodeStatisticsResult,
  CodometerStatisticGroup,
} from "@codometer/core";

/**
 * Build a single shields.io badge markdown image.
 */
export function buildBadge(
  label: string,
  value: number | string,
  color: string,
): string {
  return `![${label}](https://img.shields.io/badge/${encodeValue(label)}-${encodeValue(value)}-${color}?style=flat-square)`;
}

/** Renders the Css badge group. */
export function buildCssGroup(statistics: CodeStatisticsResult): string {
  const { css } = statistics;

  return buildGroup("CSS", [
    buildBadge("CSS Files", css.files, "264de4"),
    buildBadge("CSS Lines", css.lines, "2965f1"),
    buildBadge("CSS Rules", css.rules, "7c3aed"),
    buildBadge("CSS Selectors", css.selectors, "8b5cf6"),
    buildBadge("CSS Declarations", css.declarations, "0284c7"),
    buildBadge("CSS At Rules", css.atRules, "f97316"),
    buildBadge("CSS Media Queries", css.mediaQueries, "ea580c"),
    buildBadge("CSS Custom Properties", css.customProperties, "16a34a"),
    buildBadge("CSS Comments", css.comments, "64748b"),
    ...buildCustomBadges(statistics, "css"),
  ]);
}

/**
 * Render the badges of every configured counter belonging to one group.
 *
 * Appended after a group's built-in badges rather than interleaved with them,
 * so the counters a repository added are visibly its own and the built-in
 * order stays the same as every other repository's.
 */
export function buildCustomBadges(
  statistics: CodeStatisticsResult,
  group: CodometerStatisticGroup,
): string[] {
  return statistics.custom
    .filter((statistic) => statistic.group === group)
    .map((statistic) =>
      buildBadge(statistic.label, statistic.count, statistic.color),
    );
}

/**
 * Renders the Conventions badge group.
 *
 * The one group that exists only for configured counters, and the only one
 * that disappears when none belong to it.
 */
export function buildCustomGroup(statistics: CodeStatisticsResult): string {
  const badges = buildCustomBadges(statistics, "conventions");

  if (badges.length === 0) {
    return "";
  }

  return buildGroup("Conventions", badges);
}

/**
 * Renders every custom statistic's breaching instances as its own section.
 *
 * Generalized past the `comment` selector, the only per-instance selector
 * spec #749 user story 16 names today: whichever selector a `custom`
 * statistic's `instances` came from, each one becomes a bullet naming the
 * file and line it was found at. A statistic that only counts — no
 * `instances` at all — or one carrying no breaches this run contributes
 * nothing, the same instinct `buildCustomGroup` already follows when nothing
 * belongs to a group.
 */
export function buildCustomStatisticInstancesSection(
  statistics: CodeStatisticsResult,
): string {
  return statistics.custom
    .filter((statistic) => (statistic.instances?.length ?? 0) > 0)
    .map((statistic) => {
      const bullets = (statistic.instances ?? []).map(
        (instance) =>
          `- \`${instance.file}:${instance.line}\` — measured ${instance.measured}`,
      );

      return buildGroup(`📝 ${statistic.label}`, bullets);
    })
    .join("\n\n");
}

/**
 * Build one labelled group of badges.
 *
 * The label is what makes an unqualified counter readable: `Classes` under
 * the TypeScript group and `Python Classes` under the Python one are two
 * different measurements, and only the grouping says which is which.
 */
export function buildGroup(label: string, badges: string[]): string {
  // A real heading rather than a bold line: the block sits under an `##`
  // section, so `###` is the level that continues the document's outline
  // instead of imitating one, which is what markdownlint's MD036 rejects.
  return `### ${label}\n\n${badges.join("\n")}`;
}

/** Renders the Hcl badge group. */
export function buildHclGroup(statistics: CodeStatisticsResult): string {
  const { hcl } = statistics;

  return buildGroup("HCL", [
    buildBadge("HCL Files", hcl.files, "844fba"),
    buildBadge("HCL Lines", hcl.lines, "a78bfa"),
    buildBadge("HCL Blocks", hcl.blocks, "7c3aed"),
    buildBadge("HCL Resources", hcl.resources, "0284c7"),
    buildBadge("HCL Variables", hcl.variables, "16a34a"),
    buildBadge("HCL Outputs", hcl.outputs, "059669"),
    buildBadge("HCL Attributes", hcl.attributes, "0ea5e9"),
    buildBadge("HCL Interpolations", hcl.interpolations, "db2777"),
    buildBadge("HCL Comments", hcl.comments, "64748b"),
    ...buildCustomBadges(statistics, "hcl"),
  ]);
}

/** Renders the JavaScript badge group. */
export function buildJavascriptGroup(statistics: CodeStatisticsResult): string {
  const { javascript: js } = statistics;

  return buildGroup("JavaScript", [
    buildBadge("JavaScript Files", js.files, "f7df1e"),
    buildBadge("Test Files", js.testFiles, "10b981"),
    buildBadge("External Packages", js.externalPackages, "8b5cf6"),
    buildBadge("Classes", js.classes, "7c3aed"),
    buildBadge("Functions", js.functions, "16a34a"),
    buildBadge("Methods", js.methods, "15803d"),
    buildBadge("Sync Functions", js.syncFunctions, "4ade80"),
    buildBadge("Async Functions", js.asyncFunctions, "059669"),
    buildBadge("Constants", js.constants, "dc2626"),
    buildBadge("Imports", js.imports, "0284c7"),
    buildBadge("Exported Symbols", js.exported, "ea580c"),
    buildBadge("Comments", js.comments, "64748b"),
    buildBadge("Comment Lines", js.commentLines, "475569"),
    buildBadge("TODO Comments", js.todos, "ca8a04"),
  ]);
}

/** Renders the Json badge group. */
export function buildJsonGroup(statistics: CodeStatisticsResult): string {
  const { json } = statistics;

  return buildGroup("JSON", [
    buildBadge("JSON Files", json.files, "a16207"),
    buildBadge("JSON Lines", json.lines, "ca8a04"),
    buildBadge("JSON Objects", json.objects, "7c3aed"),
    buildBadge("JSON Arrays", json.arrays, "8b5cf6"),
    buildBadge("JSON Properties", json.properties, "0284c7"),
    buildBadge("JSON Strings", json.strings, "16a34a"),
    buildBadge("JSON Numbers", json.numbers, "059669"),
    buildBadge("JSON Booleans", json.booleans, "0ea5e9"),
    buildBadge("JSON Nulls", json.nulls, "64748b"),
    buildBadge("JSON Items", json.items, "475569"),
    buildBadge("JSON Nodes", json.totalNodes, "dc2626"),
    buildBadge("JSON Max Depth", json.maxDepth, "ea580c"),
    ...buildCustomBadges(statistics, "json"),
  ]);
}

/** Renders the Jupyter badge group. */
export function buildJupyterGroup(statistics: CodeStatisticsResult): string {
  const { jupyter: nb } = statistics;

  return buildGroup("Jupyter", [
    buildBadge("Notebooks", nb.files, "f37626"),
    buildBadge("Notebook Cells", nb.cells, "e8a33d"),
    buildBadge("Code Cells", nb.codeCells, "3776ab"),
    buildBadge("Markdown Cells", nb.markdownCells, "083fa1"),
    buildBadge("Raw Cells", nb.rawCells, "9ca3af"),
    buildBadge("Executed Cells", nb.executedCells, "16a34a"),
    buildBadge("Cell Outputs", nb.outputs, "059669"),
    buildBadge("Notebook Code Lines", nb.codeLines, "4b8bbe"),
    buildBadge("Notebook Classes", nb.classes, "7c3aed"),
    buildBadge("Notebook Functions", nb.functions, "22c55e"),
    buildBadge("Notebook Imports", nb.imports, "0284c7"),
    buildBadge("Notebook Decorators", nb.decorators, "db2777"),
    buildBadge("Notebook Prose Lines", nb.markdownLines, "1f6feb"),
    buildBadge("Notebook Headings", nb.headings, "a78bfa"),
    buildBadge("Notebook Links", nb.links, "10b981"),
    buildBadge("Notebook Images", nb.images, "34d399"),
    buildBadge("Notebook Code Blocks", nb.codeBlocks, "dc2626"),
    buildBadge("Notebook Properties", nb.properties, "ca8a04"),
    buildBadge("Notebook Nodes", nb.totalNodes, "a16207"),
    buildBadge("Notebook Max Depth", nb.maxDepth, "ea580c"),
    ...buildCustomBadges(statistics, "jupyter"),
  ]);
}

/** Renders the Markdown badge group. */
export function buildMarkdownGroup(statistics: CodeStatisticsResult): string {
  const { markdown: md } = statistics;

  return buildGroup("Markdown", [
    buildBadge("Markdown Files", md.files, "083fa1"),
    buildBadge("Markdown Lines", md.lines, "1f6feb"),
    buildBadge("H1", md.headingLevel1, "7c3aed"),
    buildBadge("H2", md.headingLevel2, "8b5cf6"),
    buildBadge("H3", md.headingLevel3, "a78bfa"),
    buildBadge("H4", md.headingLevel4, "c4b5fd"),
    buildBadge("H5", md.headingLevel5, "ddd6fe"),
    buildBadge("H6", md.headingLevel6, "ede9fe"),
    buildBadge("Paragraphs", md.paragraphs, "64748b"),
    buildBadge("Lists", md.lists, "16a34a"),
    buildBadge("List Items", md.listItems, "22c55e"),
    buildBadge("Task List Items", md.taskListItems, "4ade80"),
    buildBadge("Tables", md.tables, "0284c7"),
    buildBadge("Table Rows", md.tableRows, "0ea5e9"),
    buildBadge("Links", md.links, "059669"),
    buildBadge("Images", md.images, "10b981"),
    buildBadge("Code Blocks", md.codeBlocks, "dc2626"),
    buildBadge("Inline Code", md.inlineCode, "ef4444"),
    buildBadge("Block Quotes", md.blockQuotes, "ca8a04"),
    buildBadge("Thematic Breaks", md.thematicBreaks, "a16207"),
    ...buildCustomBadges(statistics, "markdown"),
  ]);
}

/** Renders the Python badge group. */
export function buildPythonGroup(statistics: CodeStatisticsResult): string {
  const { python: py } = statistics;

  return buildGroup("Python", [
    buildBadge("Python Files", py.files, "3776ab"),
    buildBadge("Python Lines", py.lines, "4b8bbe"),
    buildBadge("Python Classes", py.classes, "7c3aed"),
    buildBadge("Python Functions", py.functions, "16a34a"),
    buildBadge("Python Protocols", py.protocols, "0ea5e9"),
    buildBadge("Python Constants", py.constants, "dc2626"),
    buildBadge("Python Imports", py.imports, "0284c7"),
    buildBadge("Python Decorators", py.decorators, "db2777"),
    buildBadge("Docstrings", py.docstrings, "6366f1"),
    buildBadge("Docstring Lines", py.docstringLines, "818cf8"),
    buildBadge("Python Comments", py.comments, "64748b"),
    buildBadge("Python Comment Lines", py.commentLines, "475569"),
    ...buildCustomBadges(statistics, "python"),
  ]);
}

/**
 * Renders the whole-tree badge group, named after what the run measured.
 *
 * `Repository` only when the measured directory is the repository. A run
 * scoped to one project heads the same badges `Project`, because the figures
 * beneath cover that project and nothing else — the badges themselves are
 * unchanged, only what they are said to be about.
 */
export function buildRepositoryGroup(
  statistics: CodeStatisticsResult,
  scope: MeasurementScope,
): string {
  return buildGroup(scope === "repository" ? "Repository" : "Project", [
    buildBadge("Lines of Code", statistics.linesOfCode, "22c55e"),
    buildBadge(
      "Repository Size",
      formatBytes(statistics.repositoryBytes),
      "6b7280",
    ),
    buildBadge("Folders", statistics.folders, "4a4a4a"),
    buildBadge("Source Files", statistics.sourceFiles, "3178c6"),
    ...buildCustomBadges(statistics, "repository"),
  ]);
}

/** Renders the Shell badge group. */
export function buildShellGroup(statistics: CodeStatisticsResult): string {
  const { shell } = statistics;

  return buildGroup("Shell", [
    buildBadge("Shell Files", shell.files, "89e051"),
    buildBadge("Shell Lines", shell.lines, "4eaa25"),
    buildBadge("Shell Functions", shell.functions, "16a34a"),
    buildBadge("Shell Variables", shell.variables, "0284c7"),
    buildBadge("Shell Exports", shell.exports, "ea580c"),
    buildBadge("Shell Conditionals", shell.conditionals, "7c3aed"),
    buildBadge("Shell Loops", shell.loops, "8b5cf6"),
    buildBadge("Shell Pipelines", shell.pipelines, "059669"),
    buildBadge("Shebangs", shell.shebangs, "6b7280"),
    buildBadge("Shell Comments", shell.comments, "64748b"),
    buildBadge("Shell Comment Lines", shell.commentLines, "475569"),
    ...buildCustomBadges(statistics, "shell"),
  ]);
}

/** Renders the Sql badge group. */
export function buildSqlGroup(statistics: CodeStatisticsResult): string {
  const { sql } = statistics;

  return buildGroup("SQL", [
    buildBadge("SQL Files", sql.files, "e38c00"),
    buildBadge("SQL Lines", sql.lines, "f29111"),
    buildBadge("SQL Statements", sql.statements, "7c3aed"),
    buildBadge("SQL Selects", sql.selects, "16a34a"),
    buildBadge("SQL Inserts", sql.inserts, "22c55e"),
    buildBadge("SQL Updates", sql.updates, "0ea5e9"),
    buildBadge("SQL Deletes", sql.deletes, "dc2626"),
    buildBadge("SQL Creates", sql.creates, "0284c7"),
    buildBadge("SQL Joins", sql.joins, "8b5cf6"),
    buildBadge("SQL CTEs", sql.commonTableExpressions, "059669"),
    buildBadge("SQL Comments", sql.comments, "64748b"),
    ...buildCustomBadges(statistics, "sql"),
  ]);
}

/**
 * Renders the Measured Targets badge group, one badge per measured target.
 *
 * The group exists only when a run measured a declared target's size, which is
 * what tells a run measuring one project from the run measuring the whole
 * repository: a project declares build output to size, the repository declares
 * none and keeps the single `Repository Size` badge it already had. A target
 * that asked for no size analysis contributes no badge rather than a zero,
 * because "not measured" and "measured as empty" must not read alike.
 *
 * The compression rides in the value, since a gzipped figure and a raw one are
 * not the same measurement and a badge showing only the number would let them
 * be compared as though they were.
 */
export function buildTargetsGroup(targets: readonly TargetSize[]): string {
  if (targets.length === 0) {
    return "";
  }

  // "Measured Targets" rather than "Targets": codometer's own documentation
  // carries a `Targets` heading explaining the configuration field, and a
  // badge group by the same name would collide with it in the one README that
  // is both.
  return buildGroup(
    "Measured Targets",
    targets.map((target) =>
      buildBadge(`${target.name} Size`, formatTargetSize(target), "6b7280"),
    ),
  );
}

/** Renders the Toml badge group. */
export function buildTomlGroup(statistics: CodeStatisticsResult): string {
  const { toml } = statistics;

  return buildGroup("TOML", [
    buildBadge("TOML Files", toml.files, "9c4221"),
    buildBadge("TOML Lines", toml.lines, "b45309"),
    buildBadge("TOML Tables", toml.tables, "7c3aed"),
    buildBadge("TOML Array Tables", toml.arrayTables, "8b5cf6"),
    buildBadge("TOML Keys", toml.keys, "0284c7"),
    buildBadge("TOML Arrays", toml.arrays, "16a34a"),
    buildBadge("TOML Comments", toml.comments, "64748b"),
    ...buildCustomBadges(statistics, "toml"),
  ]);
}

/** Renders the TypeScript badge group. */
export function buildTypescriptGroup(statistics: CodeStatisticsResult): string {
  const { typescript: ts } = statistics;

  return buildGroup("TypeScript", [
    buildBadge("TypeScript Files", ts.files, "3178c6"),
    buildBadge("Interfaces", ts.interfaces, "0ea5e9"),
    buildBadge("Generic Declarations", ts.genericDeclarations, "0369a1"),
    buildBadge("Enums", ts.enums, "f97316"),
    buildBadge("Decorators", ts.decorators, "db2777"),
    buildBadge("Doc Comments", ts.docComments, "6366f1"),
    ...buildCustomBadges(statistics, "typescript"),
  ]);
}

/** Renders the Yaml badge group. */
export function buildYamlGroup(statistics: CodeStatisticsResult): string {
  const { yaml } = statistics;

  return buildGroup("YAML", [
    buildBadge("YAML Files", yaml.files, "cb171e"),
    buildBadge("YAML Lines", yaml.lines, "e34c26"),
    buildBadge("YAML Documents", yaml.documents, "f97316"),
    buildBadge("YAML Mappings", yaml.mappings, "7c3aed"),
    buildBadge("YAML Sequences", yaml.sequences, "8b5cf6"),
    buildBadge("YAML Keys", yaml.keys, "0284c7"),
    buildBadge("YAML Scalars", yaml.scalars, "16a34a"),
    buildBadge("YAML Anchors", yaml.anchors, "059669"),
    buildBadge("YAML Aliases", yaml.aliases, "10b981"),
    buildBadge("YAML Comments", yaml.comments, "64748b"),
    buildBadge("YAML Max Depth", yaml.maxDepth, "ea580c"),
    ...buildCustomBadges(statistics, "yaml"),
  ]);
}

/**
 * Encode a value so it can safely appear in a badge URL.
 */
export function encodeValue(input: number | string): string {
  return String(input)
    .replaceAll("-", "--")
    .replaceAll("_", "__")
    .replaceAll(" ", "_");
}

/**
 * Formats one target's measured size, naming the compression it was measured
 * under unless there was none.
 *
 * An uncompressed figure is left unqualified because that is what a plain byte
 * count means everywhere else in this report; a compressed one says so, so
 * that 5.32 kB gzipped is never read as 5.32 kB on disk.
 */
export function formatTargetSize(target: TargetSize): string {
  const size = formatBytes(target.bytes);

  return target.compression === "none" ? size : `${size} ${target.compression}`;
}
