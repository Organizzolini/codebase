// 🏷️ Types

import type {
  CommentCounter,
  CommentMeasurement,
} from "../comments/comments.types";
import type { CssResult } from "../css/css.types";
import type { HclResult } from "../hcl/hcl.types";
import type { JsonResult } from "../json/json.types";
import type { JupyterResult } from "../jupyter/jupyter.types";
import type { MarkdownResult } from "../markdown/markdown.types";
import type { PythonResult } from "../python/python.types";
import type { ShellResult } from "../shell/shell.types";
import type { SqlResult } from "../sql/sql.types";
import type { TomlResult } from "../toml/toml.types";
import type {
  TypescriptResult,
  TypescriptSymbolCounter,
} from "../typescript/typescript.types";
import type { YamlResult } from "../yaml/yaml.types";
import type { ResolvedCodometerConfiguration } from "@codometer/configuration";

/** Arguments accepted when running every language analyzer. */
export interface AnalyzeLanguagesArguments {
  /**
   * One `comment`-selector custom statistic's budget, per declared statistic.
   *
   * Every counter arrives in one list, and every measurer is handed all of
   * them: a counter naming a `kind` is measured by the TypeScript walk, and
   * every other one by the comment readers, each selecting for itself.
   */
  commentCounters: CommentCounter[];
  configuration: ResolvedCodometerConfiguration;
  discoveredFiles: DiscoveredLanguageFiles;
  /** Configured counters over declarations, tallied during the TypeScript walk. */
  symbolCounters: TypescriptSymbolCounter[];
  workingDirectory: string;
}

/** The categorized file lists every language analyzer reads from. */
export interface DiscoveredLanguageFiles {
  cssFiles: string[];
  hclFiles: string[];
  jsonFiles: string[];
  markdownFiles: string[];
  notebookFiles: string[];
  pyFiles: string[];
  shellFiles: string[];
  sourceFiles: string[];
  sqlFiles: string[];
  tomlFiles: string[];
  yamlFiles: string[];
}

/** What every language analyzer reported, keyed by language. */
export interface LanguageResults {
  /** One measurement list per configured comment counter, keyed by its label. */
  commentCounts: Record<string, CommentMeasurement[]>;
  css: CssResult;
  hcl: HclResult;
  json: JsonResult;
  jupyter: JupyterResult;
  markdown: MarkdownResult;
  python: PythonResult;
  shell: ShellResult;
  sql: SqlResult;
  toml: TomlResult;
  typescript: TypescriptResult;
  yaml: YamlResult;
}
