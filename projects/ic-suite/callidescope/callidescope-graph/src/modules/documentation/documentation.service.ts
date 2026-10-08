import { Injectable } from "@nestjs/common";
import ts from "typescript";

import { DEPRECATED_TAG } from "./documentation.constants";

import type { ReadDocumentationArguments } from "./documentation.types";
import type { CallableDocumentation } from "@callidescope/core";

/**
 * Reads what a callable's documentation comment says about it.
 *
 * Read through the type checker rather than the comment trivia above the node,
 * which is what makes it right on the shapes this repository writes. An
 * overload's comment sits on the signature rather than the implementation the
 * graph points at, and an arrow-typed member's sits on the property rather than
 * the arrow — the checker resolves both to the same symbol, and scanning
 * trivia would find neither.
 */
@Injectable()
export class DocumentationService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Collapses a documentation comment onto one line, in full.
   *
   * Nothing is shortened here. A comment is what it is, and how much of it
   * fits is a question about the thing being rendered into — an indented tree
   * in a terminal has an answer, and a JSON report consumed by a machine does
   * not. Shortening at the point of reading would impose the terminal's answer
   * on every consumer, so `ReportService` decides instead.
   */
  private readSummary(args: {
    checker: ts.TypeChecker;
    symbol: ts.Symbol;
  }): string {
    return ts
      .displayPartsToString(args.symbol.getDocumentationComment(args.checker))
      .replaceAll(/\s+/g, " ")
      .trim();
  }

  /** Resolves the symbol a declaration's documentation hangs off. */
  private readSymbol(args: ReadDocumentationArguments): ts.Symbol | undefined {
    const { checker, declaration } = args;

    if (declaration.name !== undefined) {
      return checker.getSymbolAtLocation(declaration.name);
    }

    // An arrow function has no name of its own; whatever binds it carries the
    // comment, and that is where the checker keeps the symbol too.
    const { parent } = declaration;

    return ts.isPropertyDeclaration(parent) ||
      ts.isPropertyAssignment(parent) ||
      ts.isVariableDeclaration(parent)
      ? checker.getSymbolAtLocation(parent.name)
      : undefined;
  }

  // 🌎 Public Methods

  /**
   * Reads the documentation comment, if the callable has one.
   *
   * A comment that is nothing but tags — `@deprecated` on its own — leaves the
   * summary empty, so the tags are read separately rather than inferred from
   * whether there was any prose to find.
   */
  public read(
    args: ReadDocumentationArguments,
  ): CallableDocumentation | undefined {
    const symbol = this.readSymbol(args);

    if (symbol === undefined) {
      return undefined;
    }

    const summary = this.readSummary({ checker: args.checker, symbol });
    const tags = symbol
      .getJsDocTags(args.checker)
      .map((tag) => tag.name)
      .filter((name) => name.length > 0);

    if (summary.length === 0 && tags.length === 0) {
      return undefined;
    }

    return {
      isDeprecated: tags.includes(DEPRECATED_TAG),
      summary,
      tags: [...new Set(tags)],
    };
  }
}
