import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type { Matrix } from "../../../matrix/matrix.types";
import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the U shapes embedded in a Code's 2×2 windows — three sides of a
 * unit square open on the fourth, in any of its four rotations — whether or
 * not more ink branches off it. Unlike a `countIsolatedGlyphs` template
 * match, this reads only the arms the U itself needs and ignores every
 * other arm a window's four points may also carry, which is what lets the
 * same window count as an embedded U even while a fifth arm running through
 * it also makes it something else.
 */
@Injectable()
export class EmbeddedUCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `embeddedUCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "submatrix",
    description:
      "The number of 2×2 windows whose ink forms a U shape (three sides of a unit square open on the fourth, in any rotation), whether or not further ink also passes through the same window.",
    formula: String.raw`\left|\left\{\, W \subseteq M : W \text{ carries a U's arms, in any rotation} \,\right\}\right|`,
    key: "embeddedUCount",
    name: "Embedded U Count",
    submatrix: { columns: 2, rows: 2 },
    valueType: "number",
  };

  // 🔏 Private Methods

  /** Whether the four points of one 2×2 window, read as digits, carry a U's arms in any of its four rotations. */
  private isEmbeddedU(digits: {
    bl: number;
    br: number;
    tl: number;
    tr: number;
  }): boolean {
    const { bl, br, tl, tr } = digits;

    return (
      ((tl & 4) === 4 &&
        (tr & 4) === 4 &&
        (bl & 10) === 10 &&
        (br & 9) === 9) ||
      ((tl & 6) === 6 && (tr & 5) === 5 && (bl & 8) === 8 && (br & 8) === 8) ||
      ((tl & 6) === 6 &&
        (tr & 1) === 1 &&
        (bl & 10) === 10 &&
        (br & 1) === 1) ||
      ((tl & 2) === 2 && (tr & 5) === 5 && (bl & 2) === 2 && (br & 9) === 9)
    );
  }

  /** Every 2×2 window's four digits, read without wrapping past the last row. */
  private windowDigits(
    matrix: Matrix,
    row: number,
    column: number,
  ): { bl: number; br: number; tl: number; tr: number } {
    return {
      bl: this.submatrixUtilitiesService.pointDigitAt(matrix, row + 1, column),
      br: this.submatrixUtilitiesService.pointDigitAt(
        matrix,
        row + 1,
        column + 1,
      ),
      tl: this.submatrixUtilitiesService.pointDigitAt(matrix, row, column),
      tr: this.submatrixUtilitiesService.pointDigitAt(matrix, row, column + 1),
    };
  }

  // 🌎 Public Methods

  /** Counts every 2×2 window whose ink forms a U in any rotation. */
  public compute(context: CharacteristicContext): number {
    const { matrix } = context;
    const rows = matrix.length;
    const columns = matrix[0]?.length ?? 0;
    if (rows < 2 || columns === 0) {
      return 0;
    }

    let count = 0;
    for (let row = 0; row <= rows - 2; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        if (this.isEmbeddedU(this.windowDigits(matrix, row, column))) {
          count += 1;
        }
      }
    }

    return count;
  }
}
