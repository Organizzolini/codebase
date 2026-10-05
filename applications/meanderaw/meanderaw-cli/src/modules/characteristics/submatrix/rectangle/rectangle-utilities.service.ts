import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type { Matrix } from "../../../matrix/matrix.types";
import type { SubmatrixOffset } from "../submatrix.types";

/**
 * Finds the isolated rectangular rings of a matrix for the rectangle group,
 * reading each point's Code digit through `SubmatrixUtilitiesService`.
 */
@Injectable()
export class RectangleUtilitiesService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Whether an isolated rectangle has its north-west corner at `origin` and a
   * size `isCounted` accepts: the top and left sides are walked to their far
   * corners, and the bottom and right sides must then close the ring exactly.
   */
  private isIsolatedRectangleAt(
    matrix: Matrix,
    origin: SubmatrixOffset,
    isCounted: (width: number, height: number) => boolean,
  ): boolean {
    if (
      this.submatrixUtilitiesService.pointDigitAt(
        matrix,
        origin.row,
        origin.column,
      ) !== 6
    ) {
      return false;
    }

    const width = this.sideLength(matrix, origin, {
      corner: 5,
      limit: (matrix[0]?.length ?? 0) - 1,
      step: { column: 1, row: 0 },
      straight: 3,
    });
    const height = this.sideLength(matrix, origin, {
      corner: 10,
      limit: matrix.length - 1,
      step: { column: 0, row: 1 },
      straight: 12,
    });

    return (
      width > 0 &&
      height > 0 &&
      isCounted(width, height) &&
      this.ringCloses(matrix, origin, { height, width })
    );
  }

  /**
   * Whether the bottom and right sides of a ring whose top and left sides
   * already reach their corners are exactly straights meeting at a south-east
   * corner (┘).
   */
  private ringCloses(
    matrix: Matrix,
    origin: SubmatrixOffset,
    size: { readonly height: number; readonly width: number },
  ): boolean {
    const { column, row } = origin;
    const { height, width } = size;
    const bottom = Array.from({ length: width - 1 }, (_unused, offset) =>
      this.submatrixUtilitiesService.pointDigitAt(
        matrix,
        row + height,
        column + 1 + offset,
      ),
    );
    const right = Array.from({ length: height - 1 }, (_unused, offset) =>
      this.submatrixUtilitiesService.pointDigitAt(
        matrix,
        row + 1 + offset,
        column + width,
      ),
    );

    return (
      this.submatrixUtilitiesService.pointDigitAt(
        matrix,
        row + height,
        column + width,
      ) === 9 &&
      bottom.every((digit) => digit === 3) &&
      right.every((digit) => digit === 12)
    );
  }

  /**
   * How many edges a ring's side runs from its north-west corner at `origin`
   * along `side.step` — east for the top side, south for the left — crossing
   * only `side.straight` points until it reaches a `side.corner`, or 0 when it
   * breaks first or runs past `side.limit` edges.
   */
  private sideLength(
    matrix: Matrix,
    origin: SubmatrixOffset,
    side: {
      readonly corner: number;
      readonly limit: number;
      readonly step: SubmatrixOffset;
      readonly straight: number;
    },
  ): number {
    for (let length = 1; length <= side.limit; length += 1) {
      const digit = this.submatrixUtilitiesService.pointDigitAt(
        matrix,
        origin.row + side.step.row * length,
        origin.column + side.step.column * length,
      );
      if (digit === side.corner) {
        return length;
      }
      if (digit !== side.straight) {
        return 0;
      }
    }

    return 0;
  }

  // 🌎 Public Methods

  /**
   * Counts the isolated rectangles of a matrix whose size `isCounted` accepts.
   *
   * A rectangle is a closed rectangular ring of ink whose every point carries
   * exactly its ring's arms — corners two, sides a straight pair — so nothing
   * branches off it and nothing divides it; what lies inside is not read. It is
   * found from its north-west corner, measured in edges as `width` by
   * `height`, and may cross the tile's seam, since columns wrap. A ring is at
   * most `columns - 1` edges wide, because a wider one would overlap its own
   * repeat.
   *
   * "Nothing branches off it and nothing divides it" assumes the agreement
   * invariant: every arm is reciprocated by its neighbor, the way
   * {@link TileService.assertWellFormed} checks. A context built from a
   * malformed Code can disagree with itself, and this function does not detect
   * that.
   */
  public countIsolatedRectangles(
    matrix: Matrix,
    isCounted: (width: number, height: number) => boolean,
  ): number {
    const columns = matrix[0]?.length ?? 0;
    let count = 0;

    for (let row = 0; row < matrix.length; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        if (this.isIsolatedRectangleAt(matrix, { column, row }, isCounted)) {
          count += 1;
        }
      }
    }

    return count;
  }
}
