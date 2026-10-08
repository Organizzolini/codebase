import { Injectable } from "@nestjs/common";
import tsCompiler from "typescript";

import { CommentsService } from "../comments/comments.service";

import { SYMBOL_KIND_BY_SYNTAX_KIND } from "./typescript.constants";

import type { LabeledCommentMeasurement } from "../comments/comments.types";
import type {
  PreparedDeclarationComment,
  TypescriptWalkContext,
} from "./typescript.types";

/**
 * Finds a documentable declaration's leading JSDoc comment and hands it to be
 * measured.
 *
 * Only the finding is TypeScript's: which declarations can carry a limit,
 * where the `/**` range sits, and what the declaration is called. How long the
 * comment is comes from `CommentsService`, the same counting every other
 * language's comments go through, so a word means one thing across the tool
 * rather than one thing per analyzer.
 */
@Injectable()
export class DeclarationCommentsService {
  // 🏗 Dependency Injection

  constructor(private readonly comments: CommentsService) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Reads a declaration's own name, or `"(anonymous)"` when it has none. */
  private getDeclarationName(node: tsCompiler.Node): string {
    const nodeWithName = node as tsCompiler.Node & {
      name?: { getText?: () => string };
    };

    return nodeWithName.name?.getText?.() ?? "(anonymous)";
  }

  /** Finds the node's leading JSDoc comment range, the last one if several. */
  private getJsDocRange(
    node: tsCompiler.Node,
    sourceFile: tsCompiler.SourceFile,
  ): tsCompiler.CommentRange | undefined {
    return (
      tsCompiler.getLeadingCommentRanges(
        sourceFile.text,
        node.getFullStart(),
      ) ?? []
    ).findLast(
      (candidate) =>
        candidate.kind === tsCompiler.SyntaxKind.MultiLineCommentTrivia &&
        sourceFile.text.slice(candidate.pos, candidate.pos + 3) === "/**",
    );
  }

  /**
   * Everything a measurement needs about one node, or `undefined` when there
   * is nothing to measure.
   *
   * Split out of `measure` so that method stays inside this repository's
   * statement budget without a helper on the measuring path itself — this one
   * is called before the comment counting starts, so it adds no frame to the
   * deepest stack the JSDoc walk reaches.
   */
  private prepare(
    node: tsCompiler.Node,
    context: TypescriptWalkContext,
  ): PreparedDeclarationComment | undefined {
    const { commentCounters, sourceFile } = context;
    const kind = SYMBOL_KIND_BY_SYNTAX_KIND[node.kind];

    if (kind === undefined) {
      return undefined;
    }

    const counters = commentCounters.filter((counter) => counter.kind === kind);

    if (counters.length === 0) {
      return undefined;
    }

    const range = this.getJsDocRange(node, sourceFile);

    if (range === undefined) {
      return undefined;
    }

    const source = sourceFile.text
      .slice(range.pos, range.end)
      .replaceAll("\r\n", "\n");

    return {
      counters,
      declaration: this.getDeclarationName(node),
      kind,
      line:
        sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
          .line + 1,
      prose: this.readProse(source),
      source,
    };
  }

  /**
   * The comment's prose, with its delimiters and each line's `*` stripped.
   *
   * Stripped for the word count only. A character count stays the raw slice —
   * it is the one unit a reader can check against their editor's own column
   * count, and a marker is very much a character even though it is not a word.
   */
  private readProse(text: string): string {
    return text
      .replace(/^\/\*\*/u, "")
      .replace(/\*\/$/u, "")
      .split("\n")
      .map((line) => line.replace(/^\s*\*\s?/u, ""))
      .join(" ");
  }

  // 🌎 Public Methods

  /**
   * Measures one declaration's leading JSDoc comment against every
   * comment counter that names its kind, if it has one.
   *
   * Empty when the node's kind matches no configured counter, or when it
   * carries no `/**` comment at all — neither is a measurement, and reporting
   * one would name a declaration nothing documented. A declaration is
   * measured once per counter that names its kind and once per maximum that
   * counter declares, because neither is an alternative: one can hold while
   * another breaks.
   */
  measure(
    node: tsCompiler.Node,
    context: TypescriptWalkContext,
  ): LabeledCommentMeasurement[] {
    const prepared = this.prepare(node, context);

    if (prepared === undefined) {
      return [];
    }

    const { counters, declaration, kind, line, prose, source } = prepared;
    const labeled: LabeledCommentMeasurement[] = [];

    // Walked rather than mapped: a `flatMap` callback here would be one more
    // frame on the deepest stack this package owns, and the JSDoc walk already
    // reaches this method through nine of them.
    for (const counter of counters) {
      const measurements = this.comments.measureText({
        comments: counter.budget,
        declaration,
        filePath: context.filePath,
        kind,
        line,
        prose,
        source,
      });

      for (const measurement of measurements) {
        labeled.push({ label: counter.label, measurement });
      }
    }

    return labeled;
  }
}
