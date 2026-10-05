import { Inject, Injectable } from "@nestjs/common";

import { ConnectivityService } from "../../connectivity/connectivity.service";
import { PointUtilitiesService } from "../../submatrix/point/point-utilities.service";

import type { Matrix } from "../../../matrix/matrix.types";
import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";
import type { CodeEdge } from "../../connectivity/connectivity.types";
import type { TurnTraceMetrics } from "./reverses-at-its-tightest-turn.types";

/**
 * Whether one repeat's ink reverses at its tightest possible turn: a turn
 * landing exactly one lattice step after the walk's start, or after its
 * previous turn — the verbatim port of the legacy path tracer's `hasTightU`
 * check. That elapsed-step rule, not a same-hand comparison, is what
 * "tightest" means here: two turns of *opposite* hands one step apart still
 * count, which is why this differs from `tightestTurnCountCharacteristic`'s
 * same-hand adjacency check. Always `false` when any point carries three or
 * four arms — read directly off its own digit, not off the graph
 * `ConnectivityService` builds — since a junction ends every strand before a
 * turn can be judged.
 */
@Injectable()
export class ReversesAtItsTightestTurnCharacteristicService implements CharacteristicEvaluator<boolean> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(ConnectivityService)
    private readonly connectivityService: ConnectivityService,
    @Inject(PointUtilitiesService)
    private readonly pointUtilitiesService: PointUtilitiesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `reversesAtItsTightestTurn` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "path",
    description:
      "Whether one repeat's ink turns again exactly one lattice step after its walk starts or after its previous turn, over a Code with no three- or four-armed points at all.",
    formula: String.raw`\exists\, i : \tau_i \in \{1, 3\} \wedge \Delta_i = 1`,
    key: "reversesAtItsTightestTurn",
    name: "Reverses At Its Tightest Turn",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  /** Advances one step along the path and updates tracking state. */
  private advancePath(args: {
    adjacency: Map<string, string[]>;
    columns: number;
    currentNode: string;
    metrics: TurnTraceMetrics;
    nextNode: string;
    previousDirection: number;
    stepsSinceTurn: number;
    visited: Set<string>;
  }): {
    currentNode: string;
    direction: number;
    nextNode: string | undefined;
    stepsSinceTurn: number;
  } {
    const loopDetected = args.visited.has(args.nextNode);
    args.visited.add(args.nextNode);

    const direction = this.getDirection(
      args.currentNode,
      args.nextNode,
      args.columns,
    );

    const stepsSinceTurn =
      args.previousDirection !== -1 && direction !== -1
        ? this.applyTurn(
            (direction - args.previousDirection + 4) % 4,
            args.metrics,
            args.stepsSinceTurn,
          )
        : args.stepsSinceTurn + 1;

    const previous = args.currentNode;
    const currentNode = args.nextNode;
    const nextNode = loopDetected
      ? undefined
      : this.findNextNode(
          { current: currentNode, previous },
          args.adjacency,
          args.visited,
        );

    return { currentNode, direction, nextNode, stepsSinceTurn };
  }

  /** Records a turn against the metrics if it landed exactly one step after the last one, and resets the step count whenever a turn occurs. */
  private applyTurn(
    turn: number,
    metrics: TurnTraceMetrics,
    stepsSinceTurn: number,
  ): number {
    if (turn === 0 || turn === 2) {
      return stepsSinceTurn + 1;
    }

    if (stepsSinceTurn === 1) {
      metrics.hasTightU = true;
    }

    return 0;
  }

  /** Builds an adjacency list from the given edges. */
  private buildAdjacencyGraph(
    edges: readonly CodeEdge[],
  ): Map<string, string[]> {
    const adjacency = new Map<string, string[]>();
    for (const { from, to } of edges) {
      if (!adjacency.has(from)) adjacency.set(from, []);
      if (!adjacency.has(to)) adjacency.set(to, []);
      adjacency.get(from)?.push(to);
      adjacency.get(to)?.push(from);
    }
    return adjacency;
  }

  /** Checks for a turn closing a loop back to the walk's own start. */
  private checkFinalLoopTurn(args: {
    currentNode: string;
    initialDirection: number;
    initialNode: string;
    metrics: TurnTraceMetrics;
    previousDirection: number;
    stepsSinceTurn: number;
  }): void {
    if (
      args.previousDirection !== -1 &&
      args.currentNode === args.initialNode &&
      args.initialDirection !== -1
    ) {
      this.applyTurn(
        (args.initialDirection - args.previousDirection + 4) % 4,
        args.metrics,
        args.stepsSinceTurn,
      );
    }
  }

  /** Finds the next node in the path. */
  private findNextNode(
    nodes: { current: string; previous: string | undefined },
    adjacency: Map<string, string[]>,
    visited: Set<string>,
  ): string | undefined {
    const neighbors = this.getNeighbors(nodes.current, adjacency);
    const unvisited = neighbors.find((node) => !visited.has(node));
    if (unvisited) return unvisited;
    if (neighbors.length === 2 && nodes.previous !== undefined) {
      return neighbors.find((node) => node !== nodes.previous);
    }
    return undefined;
  }

  /** Finds a suitable start node, preferring one with degree 1 if available in the same component. */
  private findStartNode(
    startNode: string,
    adjacency: Map<string, string[]>,
  ): string {
    const startNeighbors = this.getNeighbors(startNode, adjacency);
    if (startNeighbors.length !== 2) return startNode;

    const queue = [startNode];
    const visited = new Set<string>([startNode]);

    for (const node of queue) {
      const neighbors = this.getNeighbors(node, adjacency);
      if (neighbors.length === 1) return node;

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    return startNode;
  }

  /** Returns 0=Up, 1=Right, 2=Down, 3=Left or -1 if invalid. */
  private getDirection(from: string, to: string, columns: number): number {
    const fromPos = this.parseKey(from);
    const toPos = this.parseKey(to);

    if (fromPos.row === toPos.row) {
      if (toPos.column === (fromPos.column + 1) % columns) return 1;
      if (fromPos.column === (toPos.column + 1) % columns) return 3;
    }

    if (fromPos.column === toPos.column) {
      if (toPos.row === fromPos.row + 1) return 2;
      if (fromPos.row === toPos.row + 1) return 0;
    }

    return -1;
  }

  /** Gets neighbors of a node. */
  private getNeighbors(
    node: string,
    adjacency: Map<string, string[]>,
  ): string[] {
    return adjacency.get(node) ?? [];
  }

  /** Whether every point in the Code carries at most two arms of its own, read directly off its digit rather than off the graph. */
  private isJunctionFree(matrix: Matrix): boolean {
    for (const row of matrix) {
      for (const point of row) {
        if (this.pointUtilitiesService.armCount(point) >= 3) return false;
      }
    }
    return true;
  }

  /** Parses a node string key into column and row integers. */
  private parseKey(key: string): { column: number; row: number } {
    const parts = key.split(",");
    return {
      column: Number.parseInt(parts[1] ?? "0", 10),
      row: Number.parseInt(parts[0] ?? "0", 10),
    };
  }

  /** Traces every disjoint path in the adjacency graph, reporting whether any of them turns tightly. */
  private tracePaths(
    adjacency: Map<string, string[]>,
    columns: number,
  ): boolean {
    const visited = new Set<string>();
    const metrics: TurnTraceMetrics = { hasTightU: false };

    for (const startNode of adjacency.keys()) {
      if (!visited.has(startNode)) {
        this.traceSinglePath({
          adjacency,
          columns,
          metrics,
          startNode,
          visited,
        });
      }
    }

    return metrics.hasTightU;
  }

  /** Traces a single path starting from a node. */
  private traceSinglePath(args: {
    adjacency: Map<string, string[]>;
    columns: number;
    metrics: TurnTraceMetrics;
    startNode: string;
    visited: Set<string>;
  }): void {
    let currentNode = this.findStartNode(args.startNode, args.adjacency);
    args.visited.add(currentNode);

    let previousDirection = -1;
    let stepsSinceTurn = 0;
    let nextNode = this.findNextNode(
      { current: currentNode, previous: undefined },
      args.adjacency,
      args.visited,
    );

    const initialNode = currentNode;
    let initialDirection = -1;

    while (nextNode) {
      const step = this.advancePath({
        adjacency: args.adjacency,
        columns: args.columns,
        currentNode,
        metrics: args.metrics,
        nextNode,
        previousDirection,
        stepsSinceTurn,
        visited: args.visited,
      });
      if (initialDirection === -1) initialDirection = step.direction;
      previousDirection = step.direction;
      stepsSinceTurn = step.stepsSinceTurn;
      currentNode = step.currentNode;
      nextNode = step.nextNode;
    }

    this.checkFinalLoopTurn({
      currentNode,
      initialDirection,
      initialNode,
      metrics: args.metrics,
      previousDirection,
      stepsSinceTurn,
    });
  }

  // 🌎 Public Methods

  /** Walks every strand of a junction-free Code's wrapped repeat graph, reporting whether any turn lands exactly one step after the previous one. */
  public compute(context: CharacteristicContext): boolean {
    if (!this.isJunctionFree(context.matrix)) {
      return false;
    }

    const edges = this.connectivityService.edges(context.matrix, false);
    if (edges.length === 0) {
      return false;
    }

    const adjacency = this.buildAdjacencyGraph(edges);
    for (const neighbors of adjacency.values()) {
      if (neighbors.length > 2) {
        return false;
      }
    }

    return this.tracePaths(adjacency, context.columns);
  }
}
