import { readFileSync } from "node:fs";
import path from "node:path";

import { CODOMETER_COMMENT_LANGUAGES } from "@codometer/configuration";
import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import { CommentsService } from "./comments.service";
import { CssCommentsService } from "./css-comments.service";
import { HashCommentsService } from "./hash-comments.service";
import { HclCommentsService } from "./hcl-comments.service";
import { SqlCommentsService } from "./sql-comments.service";
import { TypescriptCommentsService } from "./typescript-comments.service";
import { YamlCommentsService } from "./yaml-comments.service";

import type {
  CommentCounter,
  CommentMeasurement,
  CommentToken,
  LanguageCommentFiles,
  LocatedCommentToken,
  MeasureLanguageCommentsArguments,
} from "./comments.types";
import type { CodometerCommentLanguage } from "@codometer/configuration";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Measures the comment blocks every `comment`-selector custom statistic asks
 * for, one counter at a time.
 *
 * Files are read here rather than inside each language analyzer, which is
 * what lets Python be measured at all: its analysis runs in a subprocess and
 * returns zeros when the interpreter is unreachable, so a gate that lived
 * there would stop gating on any machine without `uv` and say nothing about
 * it. Reading the sources directly makes the budget independent of that.
 *
 * A counter is measured on its own rather than merged with every other one
 * that shares a language: two custom statistics can watch the same language
 * with different maxima, and keeping them apart is what lets each one's own
 * breaches be counted back against its own label.
 */
@Injectable()
/* v8 ignore stop */
export class LanguageCommentsService {
  // 🏗 Dependency Injection

  constructor(
    private readonly comments: CommentsService,
    private readonly cssComments: CssCommentsService,
    private readonly hashComments: HashCommentsService,
    private readonly hclComments: HclCommentsService,
    private readonly logger: LoggerService,
    private readonly sqlComments: SqlCommentsService,
    private readonly typescriptComments: TypescriptCommentsService,
    private readonly yamlComments: YamlCommentsService,
  ) {
    this.logger.setContext(LanguageCommentsService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Reads and measures one language's files against one counter's budget. */
  private measureLanguage(args: {
    budget: CommentCounter["budget"];
    files: readonly string[];
    read: (content: string, filePath: string) => CommentToken[];
    workingDirectory: string;
  }): CommentMeasurement[] {
    const measurements: CommentMeasurement[] = [];

    for (const filePath of args.files) {
      const content = this.readFile(args.workingDirectory, filePath);

      if (content === undefined) {
        continue;
      }

      measurements.push(
        ...this.comments.measure({
          comments: args.budget,
          filePath,
          tokens: args.read(content, filePath),
        }),
      );
    }

    return measurements;
  }

  /** Measures one counter's budget against one language's discovered files. */
  private measureOneLanguage(args: {
    counter: CommentCounter;
    files: LanguageCommentFiles;
    language: CodometerCommentLanguage;
    pythonComments: readonly LocatedCommentToken[];
    workingDirectory: string;
  }): CommentMeasurement[] {
    const { counter, files, language, pythonComments, workingDirectory } = args;

    if (language === "python") {
      return this.measurePython(counter.budget, pythonComments);
    }

    const readHash = (content: string): CommentToken[] =>
      this.hashComments.read(content);
    const readers: Record<
      CodometerCommentLanguage,
      {
        files: readonly string[];
        read: (content: string, filePath: string) => CommentToken[];
      }
    > = {
      css: {
        files: files.cssFiles,
        read: (content) => this.cssComments.read(content),
      },
      hcl: {
        files: files.hclFiles,
        read: (content) => this.hclComments.read(content),
      },
      // Measured separately above: Python's tokens arrive pre-found rather
      // than read from a file list here.
      python: { files: [], read: readHash },
      shell: { files: files.shellFiles, read: readHash },
      sql: {
        files: files.sqlFiles,
        read: (content) => this.sqlComments.read(content),
      },
      toml: { files: files.tomlFiles, read: readHash },
      typescript: {
        files: files.sourceFiles,
        read: (content, filePath) =>
          this.typescriptComments.read(content, filePath),
      },
      yaml: {
        files: files.yamlFiles,
        read: (content) => this.yamlComments.read(content),
      },
    };
    const { files: languageFiles, read } = readers[language];

    return this.measureLanguage({
      budget: counter.budget,
      files: languageFiles,
      read,
      workingDirectory,
    });
  }

  /**
   * Measures Python's comments, which its own analyzer already found.
   *
   * The tokens arrive grouped by nothing, so they are split per file before
   * measuring — a block never spans two files, and `groupIntoBlocks` compares
   * line numbers that would otherwise run together.
   */
  private measurePython(
    budget: CommentCounter["budget"],
    tokens: readonly LocatedCommentToken[],
  ): CommentMeasurement[] {
    const byFile = new Map<string, CommentToken[]>();

    for (const { file, ...token } of tokens) {
      const carried = byFile.get(file) ?? [];

      carried.push(token);
      byFile.set(file, carried);
    }

    return [...byFile].flatMap(([filePath, fileTokens]) =>
      this.comments.measure({
        comments: budget,
        filePath,
        tokens: fileTokens,
      }),
    );
  }

  /** Reads one file, or reports which one it gave up on. */
  private readFile(
    workingDirectory: string,
    filePath: string,
  ): string | undefined {
    try {
      return readFileSync(path.resolve(workingDirectory, filePath), "utf8");
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn("🗒️ Skipped comment measurement", undefined, {
        filePath,
        reason,
      });

      return undefined;
    }
  }

  // 🌎 Public Methods

  /**
   * Measures every counter that names no declaration kind, keyed by the custom
   * statistic's label.
   *
   * A counter naming no language measures every one of them; one naming a
   * language measures only that one. Either way its results land under its
   * own label, never merged with another counter's.
   */
  measure(
    args: MeasureLanguageCommentsArguments,
  ): Record<string, CommentMeasurement[]> {
    const { counters, files, pythonComments, workingDirectory } = args;
    const results: Record<string, CommentMeasurement[]> = {};

    for (const counter of counters) {
      // `kind` takes precedence over `language`: a counter naming one is a
      // budget over a declaration's JSDoc, measured by the TypeScript walk —
      // the only place the declaration node it needs exists — and its
      // `language` is never read. Naming both is unusual, but the schema does
      // not forbid it, so this guard and the walk's own selection are the
      // tie-break.
      if (counter.kind !== undefined) {
        continue;
      }

      const languages =
        counter.language === undefined
          ? CODOMETER_COMMENT_LANGUAGES
          : [counter.language];

      results[counter.label] = languages.flatMap((language) =>
        this.measureOneLanguage({
          counter,
          files,
          language,
          pythonComments,
          workingDirectory,
        }),
      );
    }

    return results;
  }
}
