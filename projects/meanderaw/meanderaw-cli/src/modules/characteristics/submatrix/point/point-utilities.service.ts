import { Injectable } from "@nestjs/common";

import type { MatrixPoint } from "../../../matrix/matrix.types";

/**
 * Shared reading of a single point's raw arm count, injected by every
 * `submatrix/point` evaluator that needs it rather than read off the grid
 * independently.
 */
@Injectable()
export class PointUtilitiesService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * How many of a point's four arms carry ink — its raw digit degree, read
   * directly off the point rather than through the connectivity graph. A
   * north or south arm at the band's own border counts here even though it
   * joins nothing, which is what lets `edgeCount` and `inkPointCount` agree
   * with the legacy digit histogram they port.
   */
  public armCount(point: MatrixPoint): number {
    return [point.east, point.north, point.south, point.west].filter(Boolean)
      .length;
  }
}
