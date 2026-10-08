import { Injectable } from "@nestjs/common";
import ts from "typescript";

import { ClassesService } from "../classes/classes.service";
import { ExternalService } from "../classes/external.service";

import {
  COMPUTED_MEMBER_CALL,
  DYNAMIC_CALL,
  EXTERNAL_CALL,
  NO_IMPLEMENTATION_CALL,
  NO_SYMBOL_CALL,
  TOO_MANY_IMPLEMENTATIONS_CALL,
} from "./edges.constants";

import type { ResolvedCallSite } from "./edges.types";

/**
 * Resolves one call expression to the declarations it can reach.
 *
 * The fast path is asking the checker for the symbol at the member name, which
 * already answers the case this tool exists for: a call on a constructor-
 * injected property. The parameter property carries the service's type, the
 * checker follows it, and no dependency-injection machinery is needed to trace
 * a NestJS call graph. Everything below that is the long tail.
 */
@Injectable()
export class SymbolResolutionService {
  // 🏗 Dependency Injection

  constructor(
    private readonly classHierarchyService: ClassesService,
    private readonly externalService: ExternalService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** True when a declaration is a signature rather than an implementation. */
  private isAbstractMember(declaration: ts.Declaration): boolean {
    if (
      ts.isMethodSignature(declaration) ||
      ts.isPropertySignature(declaration)
    ) {
      return true;
    }

    return (
      (ts.isMethodDeclaration(declaration) ||
        ts.isPropertyDeclaration(declaration)) &&
      (ts.getCombinedModifierFlags(declaration) & ts.ModifierFlags.Abstract) !==
        0
    );
  }

  /**
   * True when a declaration is a function form that can carry a body.
   *
   * Spelled out rather than using `ts.isFunctionLike`, which also admits bare
   * call and construct signatures — those have no body to push a frame for, and
   * narrowing to them makes `.body` unreadable.
   */
  private isBodyCarrying(
    declaration: ts.Declaration,
  ): declaration is
    | ts.ArrowFunction
    | ts.ConstructorDeclaration
    | ts.FunctionDeclaration
    | ts.FunctionExpression
    | ts.GetAccessorDeclaration
    | ts.MethodDeclaration
    | ts.SetAccessorDeclaration {
    return (
      ts.isArrowFunction(declaration) ||
      ts.isConstructorDeclaration(declaration) ||
      ts.isFunctionDeclaration(declaration) ||
      ts.isFunctionExpression(declaration) ||
      ts.isGetAccessorDeclaration(declaration) ||
      ts.isMethodDeclaration(declaration) ||
      ts.isSetAccessorDeclaration(declaration)
    );
  }

  /** Keeps the declarations that actually have a body to execute. */
  private readBodied(
    declarations: readonly ts.Declaration[],
  ): ts.Declaration[] {
    return declarations.filter((declaration) => {
      if (this.isBodyCarrying(declaration)) {
        return declaration.body !== undefined;
      }

      return ts.isPropertyDeclaration(declaration) ||
        ts.isVariableDeclaration(declaration)
        ? declaration.initializer !== undefined
        : false;
    });
  }

  /** Reads the name node a call's callee is identified by. */
  private readCalleeName(
    expression: ts.CallExpression | ts.NewExpression,
  ): ts.Node | undefined {
    const callee = expression.expression;

    if (ts.isPropertyAccessExpression(callee)) {
      return callee.name;
    }

    if (ts.isElementAccessExpression(callee)) {
      return ts.isStringLiteral(callee.argumentExpression)
        ? callee.argumentExpression
        : undefined;
    }

    return ts.isIdentifier(callee) ? callee : undefined;
  }

  /**
   * Names the type a member is declared on, and where that name is written.
   *
   * The name node comes back alongside the text because the checker needs a
   * location to resolve the owning symbol from, and fetching it separately
   * would mean checking twice that the owner exists at all.
   */
  private readOwner(
    declaration: ts.Declaration,
  ): undefined | { name: ts.Identifier } {
    const { parent } = declaration;

    if (!ts.isInterfaceDeclaration(parent) && !ts.isClassDeclaration(parent)) {
      return undefined;
    }

    return parent.name === undefined ? undefined : { name: parent.name };
  }

  /** Names how a resolved call reached its target. */
  private readResolution(args: {
    callee: ts.Expression;
    symbol: ts.Symbol;
  }): "alias" | "direct" | "super" {
    if (
      ts.isPropertyAccessExpression(args.callee) &&
      args.callee.expression.kind === ts.SyntaxKind.SuperKeyword
    ) {
      return "super";
    }

    return (args.symbol.flags & ts.SymbolFlags.Alias) === 0
      ? "direct"
      : "alias";
  }

  /**
   * Resolves an already-identified callee symbol to its declarations.
   *
   * Split from `resolve` so that identifying the callee and following it stay
   * separately readable — and separately testable, since the shapes that fail
   * to identify a callee are nothing like the shapes that fail to follow one.
   */
  private resolveSymbol(args: {
    callee: ts.Expression;
    checker: ts.TypeChecker;
    symbol: ts.Symbol;
  }): ResolvedCallSite {
    const resolved = this.unwrapAlias({
      checker: args.checker,
      symbol: args.symbol,
    });
    const declaredIn = resolved.getDeclarations() ?? [];

    // Checked before anything else is attempted. Most calls in any real file
    // land in a dependency or in `lib.es5.d.ts`, and those are leaves rather
    // than gaps — recording them as unresolved would bury the handful of calls
    // that genuinely could not be followed under thousands that never needed
    // following.
    if (
      declaredIn.length > 0 &&
      declaredIn.every((declaration) =>
        this.externalService.isExternal(declaration.getSourceFile()),
      )
    ) {
      return EXTERNAL_CALL;
    }

    const bodied = this.readBodied(declaredIn);

    if (bodied.length > 0) {
      return {
        declarations: bodied,
        reason: undefined,
        resolution: this.readResolution({
          callee: args.callee,
          symbol: args.symbol,
        }),
      };
    }

    const abstract = declaredIn.find((declaration) =>
      this.isAbstractMember(declaration),
    );

    return abstract === undefined
      ? DYNAMIC_CALL
      : this.resolveThroughHierarchy({
          checker: args.checker,
          declaration: abstract,
          memberName: resolved.getName(),
        });
  }

  /** Expands an interface or abstract member to its implementations. */
  private resolveThroughHierarchy(args: {
    checker: ts.TypeChecker;
    declaration: ts.Declaration;
    memberName: string;
  }): ResolvedCallSite {
    const owner = this.readOwner(args.declaration);
    const ownerSymbol =
      owner === undefined
        ? undefined
        : args.checker.getSymbolAtLocation(owner.name);

    if (owner === undefined || ownerSymbol === undefined) {
      return NO_IMPLEMENTATION_CALL;
    }

    const lookup = this.classHierarchyService.resolveImplementations({
      checker: args.checker,
      memberName: args.memberName,
      ownerName: owner.name.text,
      ownerSymbol,
    });

    if (lookup.exceededCandidateLimit) {
      return TOO_MANY_IMPLEMENTATIONS_CALL;
    }

    return {
      declarations: lookup.declarations,
      reason:
        lookup.declarations.length === 0 ? "no-implementation" : undefined,
      resolution: "implementation",
    };
  }

  /** Unwraps an import alias to the symbol it actually names. */
  private unwrapAlias(args: {
    checker: ts.TypeChecker;
    symbol: ts.Symbol;
  }): ts.Symbol {
    // The full form rather than the immediate one: a re-export chain through a
    // package's `src/index.ts` is several hops, and stopping at the first only
    // ever finds the barrel.
    return (args.symbol.flags & ts.SymbolFlags.Alias) === 0
      ? args.symbol
      : args.checker.getAliasedSymbol(args.symbol);
  }

  // 🌎 Public Methods

  /** Resolves a call expression to every declaration it can reach. */
  public resolve(args: {
    checker: ts.TypeChecker;
    expression: ts.CallExpression;
  }): ResolvedCallSite {
    const callee = args.expression.expression;

    if (
      ts.isElementAccessExpression(callee) &&
      !ts.isStringLiteral(callee.argumentExpression)
    ) {
      return COMPUTED_MEMBER_CALL;
    }

    const nameNode = this.readCalleeName(args.expression);

    if (nameNode === undefined) {
      return DYNAMIC_CALL;
    }

    const symbol = args.checker.getSymbolAtLocation(nameNode);

    if (symbol === undefined) {
      return NO_SYMBOL_CALL;
    }

    return this.resolveSymbol({
      callee,
      checker: args.checker,
      symbol,
    });
  }

  /** Resolves a `new` expression to the constructor it runs, if any. */
  public resolveConstructor(args: {
    checker: ts.TypeChecker;
    expression: ts.NewExpression;
  }): ResolvedCallSite {
    const signature = args.checker.getResolvedSignature(args.expression);
    const declaration = signature?.declaration;

    if (
      declaration === undefined ||
      !ts.isConstructorDeclaration(declaration) ||
      declaration.body === undefined
    ) {
      // A class with no constructor of its own runs nothing worth a frame.
      return EXTERNAL_CALL;
    }

    return {
      declarations: [declaration],
      reason: undefined,
      resolution: "direct",
    };
  }
}
