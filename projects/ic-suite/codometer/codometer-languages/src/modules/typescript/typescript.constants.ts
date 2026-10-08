// ♟️ Constants

import tsCompiler from "typescript";

import type { TypescriptResult } from "./typescript.types";
import type {
  CodometerSymbolKind,
  CodometerSymbolModifier,
} from "@codometer/core";

/**
 * The declaration kind each syntax kind is counted as.
 *
 * Purely syntactic: a callable is a `method` when it is written as a class
 * member and a `function` otherwise, including an arrow function nested
 * inside a method body, which is written as a function and not as a member.
 */
export const SYMBOL_KIND_BY_SYNTAX_KIND: Partial<
  Record<number, CodometerSymbolKind>
> = {
  [tsCompiler.SyntaxKind.ArrowFunction]: "function",
  [tsCompiler.SyntaxKind.ClassDeclaration]: "class",
  [tsCompiler.SyntaxKind.ClassExpression]: "class",
  [tsCompiler.SyntaxKind.EnumDeclaration]: "enum",
  [tsCompiler.SyntaxKind.FunctionDeclaration]: "function",
  [tsCompiler.SyntaxKind.FunctionExpression]: "function",
  [tsCompiler.SyntaxKind.GetAccessor]: "getter",
  [tsCompiler.SyntaxKind.InterfaceDeclaration]: "interface",
  [tsCompiler.SyntaxKind.MethodDeclaration]: "method",
  [tsCompiler.SyntaxKind.PropertyDeclaration]: "property",
  [tsCompiler.SyntaxKind.SetAccessor]: "setter",
};

/** The modifier each modifier keyword is counted as. */
export const SYMBOL_MODIFIER_BY_SYNTAX_KIND: Partial<
  Record<number, CodometerSymbolModifier>
> = {
  [tsCompiler.SyntaxKind.AbstractKeyword]: "abstract",
  [tsCompiler.SyntaxKind.AsyncKeyword]: "async",
  [tsCompiler.SyntaxKind.ExportKeyword]: "export",
  [tsCompiler.SyntaxKind.OverrideKeyword]: "override",
  [tsCompiler.SyntaxKind.PrivateKeyword]: "private",
  [tsCompiler.SyntaxKind.ProtectedKeyword]: "protected",
  [tsCompiler.SyntaxKind.PublicKeyword]: "public",
  [tsCompiler.SyntaxKind.ReadonlyKeyword]: "readonly",
  [tsCompiler.SyntaxKind.StaticKeyword]: "static",
};

/** Regex matching TODO and FIXME annotations inside comments. */
export const TODO_REGEX =
  /\/\/.*\b(?:TODO|FIXME)\b|\/\*[\s\S]*?\b(?:TODO|FIXME)\b[\s\S]*?\*\//g;

/** Regex matching JSDoc/TSDoc tags inside doc comments. */
export const DOC_TAG_REGEX = /@([a-zA-Z][a-zA-Z0-9-]*)/g;

/** File extensions treated as JavaScript (not TypeScript). */
export const JS_EXTENSIONS = new Set([".cjs", ".js", ".jsx", ".mjs"]);

/** Empty metrics used to initialize analyzer state. */
export const EMPTY_TYPESCRIPT_RESULT: TypescriptResult = {
  asyncFunctions: 0,
  blockComments: 0,
  classes: 0,
  commentLines: 0,
  comments: 0,
  constants: 0,
  declarationCommentCounts: {},
  decorators: 0,
  docComments: 0,
  docTags: {},
  enums: 0,
  exported: 0,
  externalPackages: new Set<string>(),
  functions: 0,
  genericDeclarations: 0,
  imports: 0,
  interfaces: 0,
  jsFiles: 0,
  lineComments: 0,
  lines: 0,
  methods: 0,
  symbolCounts: {},
  syncFunctions: 0,
  testFiles: 0,
  todos: 0,
  tsFiles: 0,
};
