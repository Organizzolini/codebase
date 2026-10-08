import { Injectable } from "@nestjs/common";

import type { CodeEdge } from "../../connectivity/connectivity.types";
import type { FreeEndPoint } from "./end.types";

/**
 * Shared free-end lookup, injected by every `path/end` evaluator that needs
 * one rather than walking the edges independently.
 */
@Injectable()
export class EndUtilitiesService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** The row and column a `row,column` point key names, falling back to the origin when either half fails to parse. */
  private position(key: string): FreeEndPoint {
    const [rowString, columnString] = key.split(",");
    const row = Number(rowString);
    const column = Number(columnString);

    return {
      column: Number.isNaN(column) ? 0 : column,
      row: Number.isNaN(row) ? 0 : row,
    };
  }

  // 🌎 Public Methods

  /**
   * The lattice positions where one repeat's ink terminates — the wrapped
   * repeat graph's degree-one vertices, named by the `row,column` keys
   * `ConnectivityService.edges` gives them.
   */
  public freeEndPoints(edges: readonly CodeEdge[]): readonly FreeEndPoint[] {
    const incidences = new Map<string, number>();
    const bump = (node: string): void => {
      incidences.set(node, (incidences.get(node) ?? 0) + 1);
    };

    for (const { from, to } of edges) {
      bump(from);
      bump(to);
    }

    const points: FreeEndPoint[] = [];
    for (const [node, count] of incidences) {
      if (count === 1) {
        points.push(this.position(node));
      }
    }

    return points;
  }
}
