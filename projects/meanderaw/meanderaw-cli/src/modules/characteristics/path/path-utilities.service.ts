import { Injectable } from "@nestjs/common";

import type { CodeEdge } from "../connectivity/connectivity.types";
import type {
  HalfEdge,
  HalfEdgeGraph,
  Heading,
  Strand,
  Turn,
} from "./path.types";

/**
 * Shared strand readings the path turn group injects: one repeat's ink cut
 * into strands at junctions and free ends, the turns along each, the
 * longest run of equal turns, and how many runs of ink touch a row.
 */
@Injectable()
export class PathUtilitiesService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Records a half-edge against the point it leaves. */
  private attach(
    graph: Map<string, HalfEdge[]>,
    node: string,
    halfEdge: HalfEdge,
  ): void {
    graph.set(node, [...(graph.get(node) ?? []), halfEdge]);
  }

  /** The half-edge a strand leaves by after arriving along `arrival`, or `undefined` when it arrives at a free end or a junction. */
  private continuation(
    graph: HalfEdgeGraph,
    arrival: HalfEdge,
  ): HalfEdge | undefined {
    const incident = graph.get(arrival.to) ?? [];
    if (incident.length !== 2) return undefined;

    return incident.find(
      (halfEdge) =>
        halfEdge.edge !== arrival.edge ||
        halfEdge.heading !== this.opposite(arrival.heading),
    );
  }

  /**
   * Splits every edge into its two half-edges. `ConnectivityService.edges`
   * names each edge from its west or north end, so an edge within one row
   * heads east from `from` and every other edge heads south; a single-column
   * self-loop gives its one point both an east and a west half-edge.
   */
  private halfEdgeGraph(edges: readonly CodeEdge[]): HalfEdgeGraph {
    const graph = new Map<string, HalfEdge[]>();

    for (const [edge, { from, to }] of edges.entries()) {
      // Heading 1 is east and 2 is south, per `Heading`'s clockwise numbering.
      const heading: Heading =
        this.position(from).row === this.position(to).row ? 1 : 2;
      this.attach(graph, from, { edge, heading, to });
      this.attach(graph, to, {
        edge,
        heading: this.opposite(heading),
        to: from,
      });
    }

    return graph;
  }

  /** The heading pointing the other way. */
  private opposite(heading: Heading): Heading {
    const opposites: readonly [Heading, Heading, Heading, Heading] = [
      2, 3, 0, 1,
    ];

    return opposites[heading];
  }

  /** The row and column a `row,column` point key names. */
  private position(key: string): { column: number; row: number } {
    const [row = 0, column = 0] = key.split(",").map(Number);

    return { column, row };
  }

  /**
   * The turn from arriving on `arrival` to leaving by `departure`. A change of
   * two, a reversal, reads as `0`: it cannot occur, because no point has two
   * half-edges heading the same way and
   * {@link PathUtilitiesService.continuation} never leaves by the half-edge it
   * arrived on.
   */
  private turnBetween(arrival: Heading, departure: Heading): Turn {
    const change = (departure - arrival + 4) % 4;
    if (change === 1) return 1;
    if (change === 3) return -1;
    return 0;
  }

  /** Walks one strand from `start` until it ends or returns to an edge already walked, marking every edge it crosses. */
  private walk(
    graph: HalfEdgeGraph,
    start: HalfEdge,
    visited: Set<number>,
  ): Turn[] {
    const turns: Turn[] = [];
    let current = start;
    visited.add(current.edge);

    for (
      let next = this.continuation(graph, current);
      next;
      next = this.continuation(graph, current)
    ) {
      turns.push(this.turnBetween(current.heading, next.heading));
      if (visited.has(next.edge)) break;
      current = next;
      visited.add(current.edge);
    }

    return turns;
  }

  // 🌎 Public Methods

  /** The length of the longest run of equal turns in `turns`, wrapping around when `closed`. */
  public longestRun(turns: readonly Turn[], closed: boolean): number {
    const breakAt = this.neighborPairs(turns, closed).findIndex(
      ([previous, next]) => previous !== next,
    );
    if (closed && breakAt === -1) return turns.length;

    const start = closed ? breakAt + 1 : 0;
    const rotated = [...turns.slice(start), ...turns.slice(0, start)];
    let longest = 0;
    let run = 0;

    for (const [index, turn] of rotated.entries()) {
      run = rotated[index - 1] === turn ? run + 1 : 1;
      longest = Math.max(longest, run);
    }

    return longest;
  }

  /** Every pair of neighbors in `items`, including the last-and-first pair when the sequence is `closed` and has more than one item. */
  public neighborPairs<T>(
    items: readonly T[],
    closed: boolean,
  ): (readonly [T, T])[] {
    const wrapped =
      closed && items.length > 1 ? [...items, ...items.slice(0, 1)] : items;

    const [first, ...rest] = wrapped;
    if (first === undefined) return [];
    let previous: T = first;

    return rest.map((item) => {
      const pair: readonly [T, T] = [previous, item];
      previous = item;
      return pair;
    });
  }

  /**
   * How many separate runs of ink touch `row`: its inked points, grouped by
   * the eastward edges joining neighbors within that row, wrapping across the
   * tile boundary. A row inked all the way round the band is one touch.
   */
  public rowTouchCount(edges: readonly CodeEdge[], row: number): number {
    const inked = new Set<number>();
    const joinedFromWest = new Set<number>();

    for (const { from, to } of edges) {
      const start = this.position(from);
      const end = this.position(to);
      if (start.row === row) inked.add(start.column);
      if (end.row === row) inked.add(end.column);
      if (start.row === row && end.row === row) joinedFromWest.add(end.column);
    }

    const runStarts = [...inked].filter(
      (column) => !joinedFromWest.has(column),
    ).length;

    return runStarts === 0 && inked.size > 0 ? 1 : runStarts;
  }

  /** The strand's turns with the straight steps dropped, leaving only its left and right turns in order. */
  public signedTurns(strand: Strand): Turn[] {
    return strand.turns.filter((turn) => turn !== 0);
  }

  /**
   * Cuts one repeat's ink into strands — maximal runs through degree-two
   * points — over the cyclic band `edges` describes. Junctions and free ends
   * end a strand, so no turn is ever read across a junction.
   */
  public strands(edges: readonly CodeEdge[]): Strand[] {
    const graph = this.halfEdgeGraph(edges);
    const visited = new Set<number>();
    const starts = [...graph.values()];
    const result: Strand[] = [];

    for (const closed of [false, true]) {
      for (const start of starts.flatMap((incident) =>
        closed || incident.length !== 2 ? incident : [],
      )) {
        if (!visited.has(start.edge)) {
          result.push({ closed, turns: this.walk(graph, start, visited) });
        }
      }
    }

    return result;
  }
}
