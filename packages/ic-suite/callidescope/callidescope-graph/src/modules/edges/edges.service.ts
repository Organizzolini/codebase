import path from "node:path";

import { Injectable } from "@nestjs/common";
import ts from "typescript";

import { LoggerService } from "@codebase/logging";

import { ExternalService } from "../classes/external.service";
import { ProgramService } from "../program/program.service";
import { WorkspaceService } from "../workspace/workspace.service";

import { CallSitesService } from "./call-sites.service";
import { SymbolResolutionService } from "./symbol-resolution.service";

import type { DiscoveredCallable } from "../callables/callables.types";
import type {
  BuildEdgesArguments,
  CallSite,
  EdgeCollection,
  ResolvedCallSite,
} from "./edges.types";
import type {
  CallableId,
  CallEdge,
  SourceLocation,
  UnresolvedCall,
} from "@callidescope/core";

/**
 * Turns every callable's body into edges in the call graph.
 *
 * Only calls landing on traced code become edges. A call into a dependency is a
 * leaf: whether `Array.prototype.map` is deeply implemented is not a fact about
 * whether this repository's layering is too deep, and counting it would make
 * every reported number move on an unrelated upgrade.
 */
@Injectable()
export class EdgesService {
  // 🏗 Dependency Injection

  constructor(
    private readonly callSitesService: CallSitesService,
    private readonly externalService: ExternalService,
    private readonly programService: ProgramService,
    private readonly symbolResolutionService: SymbolResolutionService,
    private readonly workspaceService: WorkspaceService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(EdgesService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Turns one call site into the edges and non-resolutions it produced. */
  private buildSiteEdges(args: {
    callablesById: ReadonlyMap<CallableId, DiscoveredCallable>;
    caller: DiscoveredCallable;
    excludeCallees: readonly string[];
    includeConstructorEdges: boolean;
    site: CallSite;
    workspaceRoot: string;
  }): { edges: CallEdge[]; unresolved: UnresolvedCall[] } {
    const edges = this.collectCallbackEdges(args);
    const unresolved: UnresolvedCall[] = [];
    const resolved = this.resolveSite(args);

    if (resolved === undefined) {
      return { edges, unresolved };
    }

    const calleeIds = resolved.declarations
      .filter(
        (declaration) =>
          !this.externalService.isExternal(declaration.getSourceFile()),
      )
      .map((declaration) =>
        this.resolveCallableId({
          callablesById: args.callablesById,
          declaration,
          workspaceRoot: args.workspaceRoot,
        }),
      )
      .filter((calleeId): calleeId is CallableId => calleeId !== undefined)
      .filter(
        (calleeId) =>
          !this.isExcludedCallee({
            callablesById: args.callablesById,
            calleeId,
            excludeCallees: args.excludeCallees,
          }),
      );

    const callSite = this.readLocation({
      node: args.site.expression,
      workspaceRoot: args.workspaceRoot,
    });

    for (const calleeId of calleeIds) {
      edges.push({
        calleeId,
        callerId: args.caller.node.id,
        callSite,
        candidateCount: calleeIds.length,
        resolution: resolved.resolution,
      });
    }

    // Only recorded when nothing at all resolved. A call that reached traced
    // code is not a gap, even if some of its candidates were external.
    if (resolved.reason !== undefined && calleeIds.length === 0) {
      unresolved.push({
        calleeText: args.site.expression.expression.getText().slice(0, 80),
        callerId: args.caller.node.id,
        callSite,
        reason: resolved.reason,
      });
    }

    return { edges, unresolved };
  }

  /** Records the function literals one call site passes as arguments. */
  private collectCallbackEdges(args: {
    callablesById: ReadonlyMap<CallableId, DiscoveredCallable>;
    caller: DiscoveredCallable;
    site: CallSite;
    workspaceRoot: string;
  }): CallEdge[] {
    return args.site.functionArguments
      .map((argument) =>
        this.resolveCallableId({
          callablesById: args.callablesById,
          declaration: argument,
          workspaceRoot: args.workspaceRoot,
        }),
      )
      .filter((calleeId): calleeId is CallableId => calleeId !== undefined)
      .map((calleeId) => ({
        calleeId,
        callerId: args.caller.node.id,
        callSite: this.readLocation({
          node: args.site.expression,
          workspaceRoot: args.workspaceRoot,
        }),
        candidateCount: 1,
        resolution: "callback" as const,
      }));
  }

  /**
   * Whether a callee's own display name matches a configured exclusion glob.
   *
   * Matched against `Type.member` rather than against a path: a
   * cross-cutting callable like a logger
   * has no single file worth naming, but every one of its call sites shares
   * the same display name.
   */
  private isExcludedCallee(args: {
    callablesById: ReadonlyMap<CallableId, DiscoveredCallable>;
    calleeId: CallableId;
    excludeCallees: readonly string[];
  }): boolean {
    const displayName = args.callablesById.get(args.calleeId)?.node.displayName;

    return (
      displayName !== undefined &&
      args.excludeCallees.some((glob) => path.matchesGlob(displayName, glob))
    );
  }

  /** Reads the one-based position of a node, for a report. */
  private readLocation(args: {
    node: ts.Node;
    workspaceRoot: string;
  }): SourceLocation {
    const sourceFile = args.node.getSourceFile();
    const position = sourceFile.getLineAndCharacterOfPosition(
      args.node.getStart(),
    );

    return {
      column: position.character + 1,
      filePath: this.workspaceService.toWorkspaceRelative({
        absolutePath: this.programService.toRealPath(sourceFile.fileName),
        workspaceRoot: args.workspaceRoot,
      }),
      line: position.line + 1,
    };
  }

  /**
   * Maps a resolved declaration to the callable it belongs to.
   *
   * A resolution can land on a property or variable declaration whose
   * initializer is the real function, which is how this repository writes both
   * arrow-typed class members and object-literal methods.
   */
  private resolveCallableId(args: {
    callablesById: ReadonlyMap<CallableId, DiscoveredCallable>;
    declaration: ts.Declaration;
    workspaceRoot: string;
  }): CallableId | undefined {
    const target =
      (ts.isPropertyDeclaration(args.declaration) ||
        ts.isVariableDeclaration(args.declaration)) &&
      args.declaration.initializer !== undefined
        ? args.declaration.initializer
        : args.declaration;

    const filePath = this.workspaceService.toWorkspaceRelative({
      absolutePath: this.programService.toRealPath(
        target.getSourceFile().fileName,
      ),
      workspaceRoot: args.workspaceRoot,
    });
    const candidateId = `${filePath}#${String(target.getStart())}`;

    return args.callablesById.has(candidateId) ? candidateId : undefined;
  }

  /** Resolves one call site, choosing the right strategy for its shape. */
  private resolveSite(args: {
    caller: DiscoveredCallable;
    includeConstructorEdges: boolean;
    site: CallSite;
  }): ResolvedCallSite | undefined {
    const { checker } = args.caller.projectProgram;

    if (ts.isNewExpression(args.site.expression)) {
      return args.includeConstructorEdges
        ? this.symbolResolutionService.resolveConstructor({
            checker,
            expression: args.site.expression,
          })
        : undefined;
    }

    return this.symbolResolutionService.resolve({
      checker,
      expression: args.site.expression,
    });
  }

  // 🌎 Public Methods

  /** Builds every edge in the graph, and records the calls it could not. */
  public build(args: BuildEdgesArguments): EdgeCollection {
    const edges: CallEdge[] = [];
    const unresolvedCalls: UnresolvedCall[] = [];

    for (const caller of args.callablesById.values()) {
      for (const site of this.callSitesService.collect(caller.declaration)) {
        const result = this.buildSiteEdges({
          callablesById: args.callablesById,
          caller,
          excludeCallees: args.excludeCallees,
          includeConstructorEdges: args.includeConstructorEdges,
          site,
          workspaceRoot: args.workspaceRoot,
        });

        edges.push(...result.edges);
        unresolvedCalls.push(...result.unresolved);
      }
    }

    this.logger.info("🔭 Built call graph edges", undefined, {
      edgeCount: edges.length,
    });

    return { edges, unresolvedCalls };
  }
}
