import { Injectable } from "@nestjs/common";

import { CANVAS_HEIGHT } from "./geometry.constants";

import type { Geometry } from "./geometry.types";

/**
 * Derives the shared scaling rule every meander motif is drawn against: a
 * fixed canvas height divided into `rows` grid units, with offset and stroke
 * width derived from that unit rather than set independently.
 */
@Injectable()
export class GeometryService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * A rule along each of the band's two border rows, run once across the
   * whole repeat: one from the drawing's right edge back to its left along
   * the bottom, and one along the top.
   *
   * Three families draw exactly this and differ in nothing but where their
   * own right edge falls — `boxes`, `branch`, and `parallel` — so the run
   * lives here and each of them passes its own `rightEdge` in. It is the
   * shared geometry rather than any one family's shape, and a fourth family
   * that closes its band the same way has one place to reach for rather than
   * a fourth copy to keep in step.
   *
   * `cross` is not one of them: its border draws a third run, the weft rail
   * between the two, so it composes its own.
   */
  borderPath(geometry: Geometry, rightEdge: number): string {
    const leftX = this.formatCoordinate(geometry.offset);
    const rightX = this.formatCoordinate(rightEdge);
    const topY = this.formatCoordinate(geometry.offset);
    const bottomY = this.formatCoordinate(geometry.offset + geometry.height);

    return `M${rightX} ${bottomY}H${leftX}M${rightX} ${topY}H${leftX}`;
  }

  /** Derives grid unit, offset, and stroke width from a row count and the fixed canvas height. */
  compute(rows: number): Geometry {
    const unit = CANVAS_HEIGHT / (rows + 1);

    return {
      height: CANVAS_HEIGHT,
      offset: unit / 4,
      strokeWidth: unit / 2,
      unit,
    };
  }

  /** Rounds a coordinate to five decimal places and trims any trailing zeros. */
  formatCoordinate(value: number): string {
    return Number(value.toFixed(5)).toString();
  }
}
