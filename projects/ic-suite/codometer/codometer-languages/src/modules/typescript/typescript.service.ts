import { readFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import tsCompiler from "typescript";

import { DeclarationCommentsService } from "./declaration-comments.service";
import {
  DOC_TAG_REGEX,
  EMPTY_TYPESCRIPT_RESULT,
  JS_EXTENSIONS,
  SYMBOL_KIND_BY_SYNTAX_KIND,
  SYMBOL_MODIFIER_BY_SYNTAX_KIND,
  TODO_REGEX,
} from "./typescript.constants";

import type {
  CommentCounter,
  CommentMeasurement,
} from "../comments/comments.types";
import type {
  AnalyzeTypescriptFileArguments,
  TypescriptInput,
  TypescriptResult,
  TypescriptSymbolCounter,
  TypescriptWalkContext,
} from "./typescript.types";
import type { CodometerSymbolModifier } from "@codometer/core";

/** Walks TypeScript and JavaScript ASTs to collect code metrics. */
@Injectable()
export class TypescriptService {
  // 🏗 Dependency Injection

  /** Creates the TypescriptService. */
  constructor(
    private readonly declarationComments: DeclarationCommentsService,
  ) {}

  // 🔐 Private Fields

  /**
   * What to count for each syntax kind the walk cares about.
   *
   * Read by `dispatchNode`, which is the only caller: a kind absent from the
   * table is a node this analyzer counts nothing for, so adding a statistic
   * means adding a row here rather than another branch inside the walk.
   *
   * `dispatchNode` reaches a row by computed member access, which no call
   * graph can follow — callidescope records the call as unfollowable and
   * every row here as an entry point nothing calls. So a traced stack stops
   * at `dispatchNode` and each `handle*` method appears again at the root of
   * a stack of its own. That is the price of a table over a `switch`, and
   * worth knowing before reading those roots as dead code.
   */
  private readonly kindDispatch: Partial<
    Record<
      number,
      (
        node: tsCompiler.Node,
        stats: TypescriptResult,
        insideClass: boolean,
      ) => void
    >
  > = {
    [tsCompiler.SyntaxKind.ArrowFunction]: (node, stats, insideClass) =>
      this.handleFunction(node, stats, insideClass),
    [tsCompiler.SyntaxKind.Decorator]: (_node, stats) => {
      stats.decorators++;
    },
    [tsCompiler.SyntaxKind.EnumDeclaration]: (node, stats) =>
      this.handleEnum(node, stats),
    [tsCompiler.SyntaxKind.FunctionDeclaration]: (node, stats, insideClass) =>
      this.handleFunction(node, stats, insideClass),
    [tsCompiler.SyntaxKind.FunctionExpression]: (node, stats, insideClass) =>
      this.handleFunction(node, stats, insideClass),
    [tsCompiler.SyntaxKind.GetAccessor]: (node, stats) =>
      this.handleMethodOrAccessor(node, stats),
    [tsCompiler.SyntaxKind.ImportDeclaration]: (node, stats) =>
      this.handleImport(node, stats),
    [tsCompiler.SyntaxKind.InterfaceDeclaration]: (node, stats) =>
      this.handleInterface(node, stats),
    [tsCompiler.SyntaxKind.MethodDeclaration]: (node, stats) =>
      this.handleMethodOrAccessor(node, stats),
    [tsCompiler.SyntaxKind.SetAccessor]: (node, stats) =>
      this.handleMethodOrAccessor(node, stats),
    [tsCompiler.SyntaxKind.TypeAliasDeclaration]: (node, stats) =>
      this.handleTypeAlias(node, stats),
    [tsCompiler.SyntaxKind.VariableStatement]: (node, stats) =>
      this.handleVariable(node, stats),
  };

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Read one source file, count its lines and comments, and walk its AST. */
  private analyzeFile(args: AnalyzeTypescriptFileArguments): void {
    const { commentCounters, counters, filePath, stats, workingDirectory } =
      args;
    const content = readFileSync(
      path.resolve(workingDirectory, filePath),
      "utf8",
    );
    const sourceFile = tsCompiler.createSourceFile(
      filePath,
      content,
      tsCompiler.ScriptTarget.Latest,
      true,
      this.getScriptKind(filePath),
    );

    stats.lines += content.split(/\r?\n/).length;
    stats.todos += (content.match(TODO_REGEX) ?? []).length;
    this.scanComments(content, stats);
    this.walkNode(sourceFile, {
      commentCounters,
      counters,
      filePath,
      insideClass: false,
      sourceFile,
      stats,
    });
  }

  /** Measure a documentable declaration's leading JSDoc comment, if it has one. */
  private collectDeclarationComments(
    node: tsCompiler.Node,
    context: TypescriptWalkContext,
  ): void {
    for (const { label, measurement } of this.declarationComments.measure(
      node,
      context,
    )) {
      (context.stats.declarationCommentCounts[label] ??= []).push(measurement);
    }
  }

  /** Count a discovered comment and update the appropriate metrics. */
  private countComment(commentText: string, stats: TypescriptResult): void {
    stats.comments++;
    const normalizedComment = commentText.replaceAll("\r\n", "\n");
    const lineCount = normalizedComment.split("\n").length;
    const commentLineCount = normalizedComment.includes("\n")
      ? Math.max(1, lineCount - 1)
      : 1;
    stats.commentLines += commentLineCount;

    if (commentText.startsWith("/**")) {
      stats.docComments++;
      for (const match of commentText.matchAll(DOC_TAG_REGEX)) {
        const tagName = match[1]?.toLowerCase() ?? "";
        stats.docTags[tagName] = (stats.docTags[tagName] ?? 0) + 1;
      }
      return;
    }

    if (commentText.startsWith("/*")) {
      stats.blockComments++;
      return;
    }

    stats.lineComments++;
  }

  /**
   * Tally every configured counter that claims this declaration.
   *
   * A declaration is claimed when its kind is one the counter asked for and
   * it carries every modifier the counter requires; a counter naming no
   * modifiers asks for the kind alone.
   */
  private countSymbols(
    node: tsCompiler.Node,
    context: TypescriptWalkContext,
  ): void {
    const kind = SYMBOL_KIND_BY_SYNTAX_KIND[node.kind];

    if (kind === undefined || context.counters.length === 0) {
      return;
    }

    const modifiers = this.getSymbolModifiers(node);

    for (const counter of context.counters) {
      const claimed =
        counter.kinds.includes(kind) &&
        counter.modifiers.every((modifier) => modifiers.has(modifier));

      if (claimed) {
        context.stats.symbolCounts[counter.label] =
          (context.stats.symbolCounts[counter.label] ?? 0) + 1;
      }
    }
  }

  /**
   * Build the zeroed result every file's counters accumulate into.
   *
   * Every configured counter is seeded, so one that matches nothing reports a
   * zero rather than going missing from the report entirely.
   */
  private createEmptyResult(input: TypescriptInput): TypescriptResult {
    const { sourceFiles } = input;

    return {
      ...EMPTY_TYPESCRIPT_RESULT,
      declarationCommentCounts: this.seedDeclarationCommentCounts(
        input.commentCounters,
      ),
      docTags: { ...EMPTY_TYPESCRIPT_RESULT.docTags },
      externalPackages: new Set<string>(),
      jsFiles: sourceFiles.filter((filePath) =>
        JS_EXTENSIONS.has(path.extname(filePath)),
      ).length,
      symbolCounts: Object.fromEntries(
        input.symbolCounters.map((counter) => [counter.label, 0]),
      ),
      testFiles: sourceFiles.filter((filePath) =>
        /\.(test|spec|unit\.test|integration\.test|end-to-end\.test)\.[cm]?[jt]sx?$/.test(
          filePath,
        ),
      ).length,
      tsFiles: sourceFiles.filter(
        (filePath) => !JS_EXTENSIONS.has(path.extname(filePath)),
      ).length,
    };
  }

  /** Dispatches non-class AST nodes to the appropriate metric-collection handler. */
  private dispatchNode(
    node: tsCompiler.Node,
    stats: TypescriptResult,
    insideClass: boolean,
  ): void {
    this.kindDispatch[node.kind]?.(node, stats, insideClass);
  }

  /** Narrow the configured counters to the ones that search this file. */
  private getCountersForFile(
    filePath: string,
    counters: TypescriptSymbolCounter[],
  ): TypescriptSymbolCounter[] {
    return counters.filter(
      (counter) =>
        counter.patterns.length === 0 ||
        counter.patterns.some((pattern) => path.matchesGlob(filePath, pattern)),
    );
  }

  /** Choose the dialect a file is parsed as, from its extension. */
  private getScriptKind(filePath: string): tsCompiler.ScriptKind {
    const extension = path.extname(filePath);

    if (extension === ".tsx" || extension === ".jsx") {
      return tsCompiler.ScriptKind.TSX;
    }

    return JS_EXTENSIONS.has(extension)
      ? tsCompiler.ScriptKind.JS
      : tsCompiler.ScriptKind.TS;
  }

  /** Collect the modifier keywords a node carries, by configured name. */
  private getSymbolModifiers(
    node: tsCompiler.Node,
  ): Set<CodometerSymbolModifier> {
    const keywords = tsCompiler.canHaveModifiers(node)
      ? tsCompiler.getModifiers(node)
      : undefined;
    const modifiers = new Set<CodometerSymbolModifier>();

    for (const keyword of keywords ?? []) {
      const modifier = SYMBOL_MODIFIER_BY_SYNTAX_KIND[keyword.kind];

      if (modifier !== undefined) {
        modifiers.add(modifier);
      }
    }

    return modifiers;
  }

  /** Increments class, exported, and generic counts for a class node. */
  private handleClass(node: tsCompiler.Node, stats: TypescriptResult): void {
    stats.classes++;
    if (this.hasExportKeyword(node)) stats.exported++;
    if (this.hasTypeParameters(node)) stats.genericDeclarations++;
  }

  /** Increments enum and exported counts for an enum declaration node. */
  private handleEnum(node: tsCompiler.Node, stats: TypescriptResult): void {
    stats.enums++;
    if (this.hasExportKeyword(node)) stats.exported++;
  }

  /** Increments function, method, async, sync, exported, and generic counts for a function node. */
  private handleFunction(
    node: tsCompiler.Node,
    stats: TypescriptResult,
    insideClass: boolean,
  ): void {
    if (insideClass) {
      stats.methods++;
    } else {
      stats.functions++;
      if (this.hasExportKeyword(node)) stats.exported++;
    }
    if (this.hasAsyncKeyword(node)) {
      stats.asyncFunctions++;
    } else {
      stats.syncFunctions++;
    }
    if (this.hasTypeParameters(node)) stats.genericDeclarations++;
  }

  /** Increments import count and tracks the external package name if applicable. */
  private handleImport(node: tsCompiler.Node, stats: TypescriptResult): void {
    stats.imports++;
    if (!tsCompiler.isImportDeclaration(node)) return;
    if (!tsCompiler.isStringLiteral(node.moduleSpecifier)) return;
    const specifier = node.moduleSpecifier.text;
    if (specifier && !specifier.startsWith(".") && !specifier.startsWith("/")) {
      const packageName = specifier.startsWith("@")
        ? specifier.split("/").slice(0, 2).join("/")
        : (specifier.split("/")[0] ?? specifier);
      stats.externalPackages.add(packageName);
    }
  }

  /** Increments interface, exported, and generic counts for an interface declaration node. */
  private handleInterface(
    node: tsCompiler.Node,
    stats: TypescriptResult,
  ): void {
    stats.interfaces++;
    if (this.hasExportKeyword(node)) stats.exported++;
    if (this.hasTypeParameters(node)) stats.genericDeclarations++;
  }

  /** Increments method and async or sync counts for a method or accessor node. */
  private handleMethodOrAccessor(
    node: tsCompiler.Node,
    stats: TypescriptResult,
  ): void {
    stats.methods++;
    if (this.hasAsyncKeyword(node)) {
      stats.asyncFunctions++;
    } else {
      stats.syncFunctions++;
    }
  }

  /** Increments exported and generic counts for a type alias declaration node. */
  private handleTypeAlias(
    node: tsCompiler.Node,
    stats: TypescriptResult,
  ): void {
    if (this.hasExportKeyword(node)) stats.exported++;
    if (this.hasTypeParameters(node)) stats.genericDeclarations++;
  }

  /** Increments constant and exported counts for a const variable statement. */
  private handleVariable(node: tsCompiler.Node, stats: TypescriptResult): void {
    if (!tsCompiler.isVariableStatement(node)) return;
    const isConst =
      (node.declarationList.flags & tsCompiler.NodeFlags.Const) !== 0;
    if (isConst) {
      const count = node.declarationList.declarations.length;
      stats.constants += count;
      if (this.hasExportKeyword(node)) stats.exported += count;
    }
  }

  /** Returns true when the node has an async modifier keyword. */
  private hasAsyncKeyword(node: tsCompiler.Node): boolean {
    const modifiers = tsCompiler.canHaveModifiers(node)
      ? tsCompiler.getModifiers(node)
      : undefined;
    return (
      modifiers?.some(
        (modifier) => modifier.kind === tsCompiler.SyntaxKind.AsyncKeyword,
      ) ?? false
    );
  }

  /** Returns true when the node has an export modifier keyword. */
  private hasExportKeyword(node: tsCompiler.Node): boolean {
    const modifiers = tsCompiler.canHaveModifiers(node)
      ? tsCompiler.getModifiers(node)
      : undefined;
    return (
      modifiers?.some(
        (modifier) => modifier.kind === tsCompiler.SyntaxKind.ExportKeyword,
      ) ?? false
    );
  }

  /** Returns true when the node declares one or more type parameters. */
  private hasTypeParameters(node: tsCompiler.Node): boolean {
    const nodeWithTypeParameters = node as tsCompiler.Node & {
      typeParameters?: unknown[];
    };
    return (
      "typeParameters" in node &&
      Array.isArray(nodeWithTypeParameters.typeParameters) &&
      nodeWithTypeParameters.typeParameters.length > 0
    );
  }

  /** Scan the provided source text and collect comment-based metrics. */
  private scanComments(content: string, stats: TypescriptResult): void {
    const scanner = tsCompiler.createScanner(
      tsCompiler.ScriptTarget.Latest,
      false,
      tsCompiler.LanguageVariant.Standard,
      content,
    );

    let token = scanner.scan();

    while (token !== tsCompiler.SyntaxKind.EndOfFileToken) {
      if (
        token === tsCompiler.SyntaxKind.SingleLineCommentTrivia ||
        token === tsCompiler.SyntaxKind.MultiLineCommentTrivia
      ) {
        this.countComment(scanner.getTokenText(), stats);
      }

      token = scanner.scan();
    }
  }

  /**
   * Seed one empty list per counter this walk is the measurer for.
   *
   * A counter naming a `kind` is one of those, and a counter naming only a
   * `language` is not: `kind` takes precedence, so a counter naming both is
   * measured here and its `language` never read, which is the same tie-break
   * `LanguageCommentsService` makes by skipping it. Written as a guarded loop
   * rather than a filtered `Object.fromEntries`, which would spend two of
   * `createEmptyResult`'s direct calls instead of one.
   */
  private seedDeclarationCommentCounts(
    counters: readonly CommentCounter[],
  ): Record<string, CommentMeasurement[]> {
    const seeded: Record<string, CommentMeasurement[]> = {};

    for (const counter of counters) {
      if (counter.kind !== undefined) {
        seeded[counter.label] = [];
      }
    }

    return seeded;
  }

  /** Recursively visits each AST node and dispatches to the appropriate handler. */
  private walkNode(
    node: tsCompiler.Node,
    context: TypescriptWalkContext,
  ): void {
    this.countSymbols(node, context);
    this.collectDeclarationComments(node, context);

    if (
      node.kind === tsCompiler.SyntaxKind.ClassDeclaration ||
      node.kind === tsCompiler.SyntaxKind.ClassExpression
    ) {
      this.handleClass(node, context.stats);
      const classContext = { ...context, insideClass: true };
      tsCompiler.forEachChild(node, (child) =>
        this.walkNode(child, classContext),
      );
      return;
    }

    this.dispatchNode(node, context.stats, context.insideClass);
    tsCompiler.forEachChild(node, (child) => this.walkNode(child, context));
  }

  // 🌎 Public Methods

  /** Analyzes TypeScript and JavaScript source files and returns aggregated AST metrics. */
  analyze(input: TypescriptInput): TypescriptResult {
    const stats = this.createEmptyResult(input);

    for (const filePath of input.sourceFiles) {
      this.analyzeFile({
        commentCounters: input.commentCounters,
        counters: this.getCountersForFile(filePath, input.symbolCounters),
        filePath,
        stats,
        workingDirectory: input.workingDirectory,
      });
    }

    return stats;
  }
}
