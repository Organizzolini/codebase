import path from "node:path";

import { Injectable } from "@nestjs/common";
import tsCompiler from "typescript";

import {
  JAVASCRIPT_EXTENSIONS,
  JSX_EXTENSIONS,
} from "./typescript-comments.constants";

import type { CommentToken, TypescriptCommentScan } from "./comments.types";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Reads TypeScript and JavaScript's `//` and non-JSDoc `/* ... *\/` comments
 * from the compiler's real parse, rather than its bare scanner.
 *
 * A bare `ts.createScanner` cannot tell a `/` that divides from one that opens
 * a regular expression without the parser's context, and gets it wrong on real
 * source — swallowing a long run of genuine comments as trivia inside a
 * misread token. Parsing for real and walking every leaf token's leading and
 * trailing trivia is what a full parse resolves correctly, at the cost of one
 * parse per file instead of one scan.
 *
 * A JSDoc `/**` block is skipped here — `DeclarationCommentsService`
 * already measures those — the same check it uses to find one: the
 * delimiter's first three characters.
 */
@Injectable()
/* v8 ignore stop */
export class TypescriptCommentsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Walks every leaf token, collecting the comments around it.
   *
   * Both sides of every leaf, because a comment sharing its line with the
   * token before it is that token's *trailing* trivia rather than the next
   * token's *leading* trivia — `getLeadingCommentRanges` at a token's start
   * never finds it, only `getTrailingCommentRanges` at the previous token's
   * end does.
   */
  private collectComments(
    node: tsCompiler.Node,
    sourceFile: tsCompiler.SourceFile,
    scan: TypescriptCommentScan,
  ): void {
    if (node.getChildCount(sourceFile) === 0) {
      for (const range of [
        ...(tsCompiler.getLeadingCommentRanges(
          scan.content,
          node.getFullStart(),
        ) ?? []),
        ...(tsCompiler.getTrailingCommentRanges(scan.content, node.getEnd()) ??
          []),
      ]) {
        scan.ranges.set(range.pos, range);
      }

      return;
    }

    for (const child of node.getChildren(sourceFile)) {
      this.collectComments(child, sourceFile, scan);
    }
  }

  /** Choose the dialect a file is parsed as, from its extension. */
  private getScriptKind(filePath: string): tsCompiler.ScriptKind {
    const extension = path.extname(filePath);

    if (JSX_EXTENSIONS.has(extension)) {
      return tsCompiler.ScriptKind.TSX;
    }

    return JAVASCRIPT_EXTENSIONS.has(extension)
      ? tsCompiler.ScriptKind.JS
      : tsCompiler.ScriptKind.TS;
  }

  /** Whether this range is a JSDoc block, measured elsewhere. */
  private isJsDoc(range: tsCompiler.CommentRange, source: string): boolean {
    return (
      range.kind === tsCompiler.SyntaxKind.MultiLineCommentTrivia &&
      source.startsWith("/**")
    );
  }

  /** Whether only whitespace precedes an offset on its own line. */
  private isOwnLine(content: string, index: number): boolean {
    const lineStart = content.lastIndexOf("\n", index - 1) + 1;

    return content.slice(lineStart, index).trim() === "";
  }

  /** The 1-indexed line an offset sits on. */
  private lineOf(content: string, index: number): number {
    return content.slice(0, index).split("\n").length;
  }

  /** Strips a comment's delimiters, leaving its prose. */
  private toProse(text: string): string {
    if (text.startsWith("//")) {
      return text.slice(2);
    }

    return text.replace(/^\/\*/u, "").replace(/\*\/$/u, "");
  }

  /** Turns one comment range into a token, unless it is a JSDoc block. */
  private toToken(
    range: tsCompiler.CommentRange,
    content: string,
  ): CommentToken | undefined {
    const source = content.slice(range.pos, range.end);

    if (this.isJsDoc(range, source)) {
      return undefined;
    }

    return {
      line: this.lineOf(content, range.pos),
      ownLine: this.isOwnLine(content, range.pos),
      prose: this.toProse(source),
      source,
    };
  }

  // 🌎 Public Methods

  /** Reads every non-JSDoc comment the parse finds, in source order. */
  read(content: string, filePath: string): CommentToken[] {
    const scan: TypescriptCommentScan = { content, ranges: new Map() };
    const sourceFile = tsCompiler.createSourceFile(
      filePath,
      content,
      tsCompiler.ScriptTarget.Latest,
      false,
      this.getScriptKind(filePath),
    );

    this.collectComments(sourceFile, sourceFile, scan);

    return [...scan.ranges.values()]
      .toSorted((first, second) => first.pos - second.pos)
      .flatMap((range) => {
        const token = this.toToken(range, content);

        return token === undefined ? [] : [token];
      });
  }
}
