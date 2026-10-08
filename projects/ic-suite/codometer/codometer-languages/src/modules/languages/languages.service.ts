import { Injectable } from "@nestjs/common";

import { LanguageCommentsService } from "../comments/language-comments.service";
import { CssService } from "../css/css.service";
import { HclService } from "../hcl/hcl.service";
import { JsonService } from "../json/json.service";
import { JupyterService } from "../jupyter/jupyter.service";
import { MarkdownService } from "../markdown/markdown.service";
import { PythonService } from "../python/python.service";
import { ShellService } from "../shell/shell.service";
import { SqlService } from "../sql/sql.service";
import { TomlService } from "../toml/toml.service";
import { TypescriptService } from "../typescript/typescript.service";
import { YamlService } from "../yaml/yaml.service";

import type {
  AnalyzeLanguagesArguments,
  LanguageResults,
} from "./languages.types";

/**
 * Runs every language analyzer over the discovered files.
 *
 * One collaborator for the measurement pipeline instead of eleven: which
 * languages exist is this service's business, and adding a twelfth changes
 * nothing above it.
 */
@Injectable()
export class LanguagesService {
  // 🏗 Dependency Injection

  constructor(
    private readonly cssService: CssService,
    private readonly languageComments: LanguageCommentsService,
    private readonly hclService: HclService,
    private readonly jsonService: JsonService,
    private readonly jupyterService: JupyterService,
    private readonly markdownService: MarkdownService,
    private readonly pythonService: PythonService,
    private readonly shellService: ShellService,
    private readonly sqlService: SqlService,
    private readonly tomlService: TomlService,
    private readonly typescriptService: TypescriptService,
    private readonly yamlService: YamlService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Analyze every language present in the discovered files. */
  analyze(args: AnalyzeLanguagesArguments): LanguageResults {
    const { discoveredFiles, workingDirectory } = args;
    // Analyzed first: its comments come from `tokenize` in the subprocess, so
    // comment measurement below reads them rather than the files.
    const python = this.pythonService.analyze({
      command: args.configuration.python.command,
      pythonFiles: discoveredFiles.pyFiles,
      workingDirectory,
    });

    // Both measurers take the whole counter list and select from it, rather
    // than being handed two lists split here: this method is at its declared
    // breadth limit, and a split would cost a call it has no room for. Each
    // reads `kind` — `LanguageCommentsService` skips a counter that names one,
    // and the TypeScript walk measures only those — which is also where `kind`
    // taking precedence over `language` is enforced.
    return {
      // Comment budgets are measured here rather than inside each analyzer:
      // Python's runs in a subprocess that returns zeros when the interpreter
      // is unreachable, and a gate living there would quietly stop gating.
      commentCounts: this.languageComments.measure({
        counters: args.commentCounters,
        files: discoveredFiles,
        pythonComments: python.commentTokens,
        workingDirectory,
      }),
      css: this.cssService.analyze({
        cssFiles: discoveredFiles.cssFiles,
        workingDirectory,
      }),
      hcl: this.hclService.analyze({
        hclFiles: discoveredFiles.hclFiles,
        workingDirectory,
      }),
      json: this.jsonService.analyze({
        jsonFiles: discoveredFiles.jsonFiles,
        workingDirectory,
      }),
      jupyter: this.jupyterService.analyze({
        notebookFiles: discoveredFiles.notebookFiles,
        pythonCommand: args.configuration.python.command,
        workingDirectory,
      }),
      markdown: this.markdownService.analyze({
        markdownFiles: discoveredFiles.markdownFiles,
        workingDirectory,
      }),
      python,
      shell: this.shellService.analyze({
        shellFiles: discoveredFiles.shellFiles,
        workingDirectory,
      }),
      sql: this.sqlService.analyze({
        sqlFiles: discoveredFiles.sqlFiles,
        workingDirectory,
      }),
      toml: this.tomlService.analyze({
        tomlFiles: discoveredFiles.tomlFiles,
        workingDirectory,
      }),
      typescript: this.typescriptService.analyze({
        commentCounters: args.commentCounters,
        sourceFiles: discoveredFiles.sourceFiles,
        symbolCounters: args.symbolCounters,
        workingDirectory,
      }),
      yaml: this.yamlService.analyze({
        workingDirectory,
        yamlFiles: discoveredFiles.yamlFiles,
      }),
    };
  }
}
