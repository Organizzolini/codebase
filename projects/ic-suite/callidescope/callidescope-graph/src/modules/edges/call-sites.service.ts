import { Injectable } from "@nestjs/common";
import ts from "typescript";

import type { CallableDeclaration } from "../callables/callables.types";
import type { CallSite } from "./edges.types";

/**
 * Finds the calls one callable makes, without descending into nested bodies.
 *
 * A function literal inside a body is its own frame, not part of the enclosing
 * one, so the walk stops at it. Descending would attribute a callback's calls
 * to whichever function happened to contain the callback's text, which is how
 * a shallow orchestrator ends up looking like the deepest thing in the file.
 */
@Injectable()
export class CallSitesService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** True when a node opens a new frame and the walk should stop. */
  private isNestedBody(node: ts.Node): boolean {
    return (
      ts.isArrowFunction(node) ||
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isConstructorDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node) ||
      ts.isClassDeclaration(node)
    );
  }

  /** Collects the function literals passed as arguments to one call. */
  private readFunctionArguments(
    expression: ts.CallExpression | ts.NewExpression,
  ): ts.SignatureDeclaration[] {
    return [...(expression.arguments ?? [])].filter(
      (argument): argument is ts.Expression & ts.SignatureDeclaration =>
        ts.isFunctionLike(argument),
    );
  }

  // 🌎 Public Methods

  /** Collects every call this declaration's own body makes. */
  public collect(declaration: CallableDeclaration): CallSite[] {
    const { body } = declaration;
    const sites: CallSite[] = [];

    if (body === undefined) {
      return sites;
    }

    const visit = (node: ts.Node): void => {
      if (this.isNestedBody(node)) {
        return;
      }

      if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
        sites.push({
          expression: node,
          functionArguments: this.readFunctionArguments(node),
        });
      }

      ts.forEachChild(node, visit);
    };

    // A block's calls are its children; a concise arrow body *is* the call, so
    // walking only its children would step straight past it and leave the
    // arrow reporting no callees.
    if (ts.isBlock(body)) {
      ts.forEachChild(body, visit);
    } else {
      visit(body);
    }

    return sites;
  }
}
