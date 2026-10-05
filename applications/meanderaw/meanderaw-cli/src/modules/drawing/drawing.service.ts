import { Inject, Injectable } from "@nestjs/common";

import { CodeService } from "../code/code.service";
import { GeometryService } from "../geometry/geometry.service";
import { SvgService } from "../svg/svg.service";

import type { CodeObject } from "../code/code.types";
import type { Geometry } from "../geometry/geometry.types";
import type { Directions } from "../tile/tile.types";
import type { CanvasPoint } from "./drawing.types";

/**
 * Draws a Code to SVG: the family-agnostic mechanical
 * rule generalized from the retired per-tile motif, so it applies to every
 * family's Code rather than only one family's tiles.
 *
 * Each point owns two of its four direction bits — an `east` bit draws one
 * unit right, a `south` bit one unit down — and a point owning neither is an
 * inked dot: a zero-length stroke whose square cap paints the lattice point
 * and nothing else, which is what makes the drawing space-filling with no
 * predicate to check. `north` and `west` are read only to decide whether a
 * point is bare; they draw nothing of their own, since the neighbor that
 * owns the matching `south`/`east` bit already draws that segment.
 *
 * Unlike that motif, this renderer draws no repeat unit, no leading
 * overhang, and no per-unit cap-tick clipping. A Code named by
 * `--rows`/`--columns`/`--code` is one whole meander already, not one tile
 * meant to be tiled several times, so there is no second repeat for an
 * overhang to reach into or a cap tick to stay flush with — the top and
 * bottom border rules run the grid's own full width exactly once, drawn by
 * the already-generic `GeometryService.borderPath` rather than a rule
 * reimplemented here.
 */
@Injectable()
export class DrawingService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(CodeService)
    private readonly codeService: CodeService,
    @Inject(GeometryService)
    private readonly geometryService: GeometryService,
    @Inject(SvgService)
    private readonly svgService: SvgService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** The path data every point of the Code draws, in reading order. */
  private codeSegments(geometry: Geometry, code: CodeObject): string {
    const { repeats } = code;
    const segments: string[] = [];

    for (let repeatIndex = 0; repeatIndex < repeats; repeatIndex += 1) {
      const columnOffset = repeatIndex * code.columns;

      for (let row = 0; row < code.rows; row += 1) {
        for (let column = 0; column < code.columns; column += 1) {
          const absoluteColumn = columnOffset + column;

          const directions: Directions = this.codeService.directionsAt(
            code,
            row,
            column,
          );

          segments.push(
            this.pointSegments(geometry, directions, {
              x: geometry.offset + absoluteColumn * geometry.unit,
              y: geometry.offset + (row + 1) * geometry.unit,
            }),
          );
        }
      }
    }

    return segments.join("");
  }

  /** Rounds and trims one pixel coordinate for interpolation into path data. */
  private format(value: number): string {
    return this.geometryService.formatCoordinate(value);
  }

  /** Whether a point carries no direction bit at all, own or neighbor's. */
  private isBare(point: Directions): boolean {
    return !point.east && !point.north && !point.south && !point.west;
  }

  /** The path data one point draws: the edges it owns, or a dot where it owns none. */
  private pointSegments(
    geometry: Geometry,
    point: Directions,
    origin: CanvasPoint,
  ): string {
    const startX = this.format(origin.x);
    const startY = this.format(origin.y);

    if (this.isBare(point)) {
      return `M${startX} ${startY}H${startX}`;
    }

    const east = point.east
      ? `M${startX} ${startY}H${this.format(origin.x + geometry.unit)}`
      : "";
    const south = point.south
      ? `M${startX} ${startY}V${this.format(origin.y + geometry.unit)}`
      : "";

    return `${east}${south}`;
  }

  // 🌎 Public Methods

  /**
   * Renders a Code to a complete SVG document: `rows` grid units tall — the
   * same fixed canvas height every family draws against — and `columns` grid
   * units wide, with no repeat and no addressed window, since a Code names
   * one whole meander directly.
   */
  render(code: CodeObject): string {
    const { columns, repeats, rows } = code;
    const totalColumns = columns * repeats;
    const geometry = this.geometryService.compute(rows);
    const rightEdge = geometry.offset + totalColumns * geometry.unit;
    const paths = [
      this.codeSegments(geometry, code),
      this.geometryService.borderPath(geometry, rightEdge),
    ];

    return this.svgService.render({
      height: this.format(
        geometry.offset + geometry.height + geometry.strokeWidth / 2,
      ),
      paths,
      strokeWidth: this.format(geometry.strokeWidth),
      width: this.format(rightEdge + geometry.strokeWidth / 2),
    });
  }
}
