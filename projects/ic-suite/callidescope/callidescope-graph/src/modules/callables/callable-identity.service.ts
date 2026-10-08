import { Injectable } from "@nestjs/common";
import ts from "typescript";

import { ANONYMOUS_MEMBER_NAME } from "./callables.constants";

import type { CallableDeclaration } from "./callables.types";
import type { CallableKind, SourceLocation } from "@callidescope/core";

/**
 * Gives every callable a stable identifier and a name a report can print.
 *
 * The identifier is the file path plus the declaration's start offset, not its
 * line. Two callables share a line often — an arrow property and the statement
 * holding it do — but exactly one declaration can begin at one offset, so an
 * offset cannot collide the way a line can.
 */
@Injectable()
export class CallableIdentityService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Names a function literal by the call it was passed to.
   *
   * `ExampleService.load → map(…)` reads far better in a stack than
   * `anonymous`, and it is the only name a callback ever really has.
   */
  private describeCallbackArgument(node: ts.Node): string | undefined {
    const { parent } = node;

    if (!ts.isCallExpression(parent)) {
      return undefined;
    }

    const callee = ts.isPropertyAccessExpression(parent.expression)
      ? parent.expression.name.text
      : parent.expression.getText();

    return `${callee}(…)`;
  }

  /** Reads the name a property, variable, or parameter declaration binds. */
  private readBindingName(node: ts.Node): string | undefined {
    if (
      (ts.isPropertyDeclaration(node) ||
        ts.isPropertyAssignment(node) ||
        ts.isVariableDeclaration(node)) &&
      ts.isIdentifier(node.name)
    ) {
      return node.name.text;
    }

    return undefined;
  }

  // 🌎 Public Methods

  /**
   * Classifies a function literal by whatever binds it.
   *
   * A literal has no shape of its own worth naming — what it is depends
   * entirely on where it was written down.
   */
  private readBoundKind(parent: ts.Node): CallableKind {
    if (ts.isPropertyDeclaration(parent)) {
      return "arrow-property";
    }

    return ts.isPropertyAssignment(parent) || ts.isVariableDeclaration(parent)
      ? "object-literal-method"
      : "callback";
  }

  /** Builds the identifier for one declaration. */
  public buildId(args: {
    declaration: CallableDeclaration;
    workspaceRelativePath: string;
  }): string {
    return `${args.workspaceRelativePath}#${String(args.declaration.getStart())}`;
  }

  /** Counts the statements in a body, as a proxy for how much it does. */
  public countStatements(declaration: CallableDeclaration): number {
    const { body } = declaration;

    if (body === undefined || !ts.isBlock(body)) {
      return body === undefined ? 0 : 1;
    }

    return body.statements.length;
  }

  /**
   * True when a declaration is reachable from outside its own file.
   *
   * Three shapes carry the keyword, and only one of them carries it on the
   * declaration the graph holds. A method's `export` sits on its class, and an
   * arrow constant's sits on the variable statement above the arrow — the shape
   * a React component, an anchor builder, and most barrel exports are written
   * in. Reading the arrow's own modifiers alone leaves every one of them
   * looking unexported, and so promoted as an orphan rather than classified as
   * the barrel export it is.
   */
  public isExported(declaration: CallableDeclaration): boolean {
    const modifierFlags = ts.getCombinedModifierFlags(declaration);

    if ((modifierFlags & ts.ModifierFlags.Export) !== 0) {
      return true;
    }

    const owner = ts.findAncestor(
      declaration,
      (node): node is ts.ClassDeclaration | ts.VariableDeclaration =>
        ts.isClassDeclaration(node) || ts.isVariableDeclaration(node),
    );

    return (
      owner !== undefined &&
      (ts.getCombinedModifierFlags(owner) & ts.ModifierFlags.Export) !== 0
    );
  }

  /** Builds the qualified name a report prints for a callable. */
  public readDisplayName(declaration: CallableDeclaration): string {
    const memberName = this.readMemberName(declaration);
    const typeName = this.readEnclosingTypeName(declaration);

    return typeName === undefined ? memberName : `${typeName}.${memberName}`;
  }

  /** Names the class or interface a declaration is a member of, if any. */
  public readEnclosingTypeName(
    declaration: CallableDeclaration,
  ): string | undefined {
    const owner = ts.findAncestor(
      declaration,
      (node): node is ts.ClassDeclaration | ts.ClassExpression =>
        ts.isClassDeclaration(node) || ts.isClassExpression(node),
    );

    return owner?.name?.text;
  }

  /** Classifies a declaration by the shape it was written in. */
  public readKind(declaration: CallableDeclaration): CallableKind {
    if (ts.isConstructorDeclaration(declaration)) {
      return "constructor";
    }

    if (
      ts.isGetAccessorDeclaration(declaration) ||
      ts.isSetAccessorDeclaration(declaration)
    ) {
      return "accessor";
    }

    if (ts.isMethodDeclaration(declaration)) {
      return ts.isObjectLiteralExpression(declaration.parent)
        ? "object-literal-method"
        : "method";
    }

    return ts.isFunctionDeclaration(declaration)
      ? "function"
      : this.readBoundKind(declaration.parent);
  }

  /** Reads the one-based line and column a declaration starts at. */
  public readLocation(args: {
    declaration: CallableDeclaration;
    workspaceRelativePath: string;
  }): SourceLocation {
    const sourceFile = args.declaration.getSourceFile();
    const position = sourceFile.getLineAndCharacterOfPosition(
      args.declaration.getStart(),
    );

    return {
      column: position.character + 1,
      filePath: args.workspaceRelativePath,
      line: position.line + 1,
    };
  }

  /** Reads the member name, falling back to the shape it was written in. */
  public readMemberName(declaration: CallableDeclaration): string {
    if (ts.isConstructorDeclaration(declaration)) {
      return "constructor";
    }

    if (declaration.name !== undefined && ts.isIdentifier(declaration.name)) {
      const accessor = ts.isGetAccessorDeclaration(declaration)
        ? "get "
        : ts.isSetAccessorDeclaration(declaration)
          ? "set "
          : "";

      return `${accessor}${declaration.name.text}`;
    }

    return (
      this.readBindingName(declaration.parent) ??
      this.describeCallbackArgument(declaration) ??
      ANONYMOUS_MEMBER_NAME
    );
  }
}
