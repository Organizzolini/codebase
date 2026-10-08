import { Injectable } from "@nestjs/common";

import { DocumentationService } from "../documentation/documentation.service";
import { SignaturesService } from "../signatures/signatures.service";

import type { DiscoveredCallable } from "../callables/callables.types";
import type { CondensedGraph, DepthMeasurement } from "./graph.types";
import type { CallableId, StackFrame } from "@callidescope/core";

/**
 * Rebuilds the single deepest call stack below an entry point.
 *
 * Only one path per entry point is ever materialized, by following the
 * successor each component already recorded as its deepest. Enumerating every
 * root-to-leaf path instead would be the same answer arrived at by walking a
 * number of paths that grows with the product of the branching factors, and
 * then discarding all but one of them.
 */
@Injectable()
export class PathsService {
  // 🏗 Dependency Injection

  constructor(
    private readonly documentationService: DocumentationService,
    private readonly signaturesService: SignaturesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Orders one component's members so the entered one comes first.
   *
   * Within a cycle there is no single true order, but starting at the member
   * the caller actually reached makes the printed stack match how execution
   * got there.
   */
  private orderMembers(args: {
    enteredId: CallableId | undefined;
    memberIds: readonly CallableId[];
  }): readonly CallableId[] {
    if (args.enteredId === undefined || args.memberIds.length <= 1) {
      return args.memberIds;
    }

    const index = args.memberIds.indexOf(args.enteredId);

    return index <= 0
      ? args.memberIds
      : [...args.memberIds.slice(index), ...args.memberIds.slice(0, index)];
  }

  // 🌎 Public Methods

  /** Walks the deepest chain below one callable and returns its frames. */
  public buildDeepestPath(args: {
    callablesById: ReadonlyMap<CallableId, DiscoveredCallable>;
    condensed: CondensedGraph;
    entryPointId: CallableId;
    measurement: DepthMeasurement;
  }): StackFrame[] {
    const frames: StackFrame[] = [];
    const visited = new Set<number>();

    let componentId = args.condensed.componentIdByCallable.get(
      args.entryPointId,
    );
    let enteredId: CallableId | undefined = args.entryPointId;

    while (componentId !== undefined && !visited.has(componentId)) {
      visited.add(componentId);

      const memberIds = args.condensed.memberIdsByComponent[componentId] ?? [];
      const isCycle = memberIds.length > 1;

      for (const memberId of this.orderMembers({ enteredId, memberIds })) {
        const callable = args.callablesById.get(memberId);

        if (callable !== undefined) {
          frames.push(this.buildFrame({ callable, isCycle }));
        }
      }

      const next = args.measurement.byComponent[componentId]?.deepestSuccessor;

      enteredId = undefined;
      componentId = next;
    }

    return frames;
  }

  /**
   * Turns one callable into a frame a report can print.
   *
   * Public so any traversal over the same `DiscoveredCallable` map — not only
   * this service's own deepest-path walk — can render a frame the same way,
   * rather than reading documentation and a signature by a second route.
   */
  public buildFrame(args: {
    callable: DiscoveredCallable;
    isCycle: boolean;
  }): StackFrame {
    // Read here rather than when the callable was first described: only the
    // handful of frames a report prints ever need this, and asking the checker
    // to render a type is the one part of the run that is not cheap.
    const source = {
      checker: args.callable.projectProgram.checker,
      declaration: args.callable.declaration,
    };

    return {
      displayName: args.callable.node.displayName,
      documentation: this.documentationService.read(source),
      id: args.callable.node.id,
      isCycle: args.isCycle,
      location: args.callable.node.location,
      signature: this.signaturesService.read(source),
    };
  }
}
