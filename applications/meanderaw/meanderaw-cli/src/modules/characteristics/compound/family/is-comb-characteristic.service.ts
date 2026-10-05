import { Inject, Injectable } from "@nestjs/common";

import { FamilyUtilitiesService } from "./family-utilities.service";
import { IsBarsCharacteristicService } from "./is-bars-characteristic.service";
import { IsLinesCharacteristicService } from "./is-lines-characteristic.service";
import { IsMeshCharacteristicService } from "./is-mesh-characteristic.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Whether a Code's repeating unit is a comb — a straight spine with
 * perpendicular teeth, running along one column or one row, or a pair of
 * top and bottom rails whose teeth interdigitate. Bars, lines, and mesh are
 * excluded, since each would otherwise read as a degenerate comb.
 */
@Injectable()
export class IsCombCharacteristicService implements CharacteristicEvaluator<boolean> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(FamilyUtilitiesService)
    private readonly familyUtilitiesService: FamilyUtilitiesService,
    @Inject(IsBarsCharacteristicService)
    private readonly isBarsService: IsBarsCharacteristicService,
    @Inject(IsLinesCharacteristicService)
    private readonly isLinesService: IsLinesCharacteristicService,
    @Inject(IsMeshCharacteristicService)
    private readonly isMeshService: IsMeshCharacteristicService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `isComb` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "compound",
    description:
      "Whether the repeating unit spans at least two rows and is a vertical or horizontal spine with perpendicular teeth, or top and bottom rails with interleaving teeth, without being bars, lines, or mesh.",
    formula: String.raw`\text{rows} \geq 2 \wedge (\text{spine}_{\text{column}} \vee \text{spine}_{\text{row}} \vee \text{rails}_{\text{reversing}}) \wedge \neg\,\text{isBars} \wedge \neg\,\text{isLines} \wedge \neg\,\text{isMesh}`,
    key: "isComb",
    name: "Is Comb",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  /** Whether some column pairs a downward connector on the top row with a bare north tick beneath it. */
  private hasDownTeeth(grid: readonly string[]): boolean {
    const topRow = grid.at(0);
    if (!topRow) return false;

    for (const column of Array.from(
      { length: topRow.length },
      (_, index) => index,
    )) {
      const topCharacter = topRow.at(column);
      const bottomCharacter = grid.at(1)?.at(column);
      if (
        topCharacter &&
        bottomCharacter &&
        /[765]/u.test(topCharacter) &&
        bottomCharacter === "8"
      ) {
        return true;
      }
    }

    return false;
  }

  /** Whether some column pairs a bare south tick on the second-to-last row with an upward connector beneath it. */
  private hasUpTeeth(grid: readonly string[]): boolean {
    const bottomRow = grid.at(-1);
    const secondToLast = grid.at(-2);
    if (!bottomRow || !secondToLast) return false;

    for (const column of Array.from(
      { length: bottomRow.length },
      (_, index) => index,
    )) {
      const topCharacter = secondToLast.at(column);
      const bottomCharacter = bottomRow.at(column);
      if (
        topCharacter === "4" &&
        bottomCharacter &&
        /[ba9]/u.test(bottomCharacter)
      ) {
        return true;
      }
    }

    return false;
  }

  /** Whether one row is a spine with vertical teeth and every other row holds only vertical ticks. */
  private isHorizontalComb(grid: readonly string[], rows: number): boolean {
    for (const row of Array.from({ length: rows }, (_, index) => index)) {
      const rowChars = grid.at(row);
      if (
        rowChars &&
        /^[37b65a9]+$/u.test(rowChars) &&
        /[7b]/u.test(rowChars)
      ) {
        const otherChars = grid.filter((_, index) => index !== row).join("");
        if (/^[48c]*$/u.test(otherChars)) {
          return true;
        }
      }
    }

    return false;
  }

  /** Whether top and bottom rails interdigitate with vertical teeth, joined by nothing but pillars. */
  private isReversingComb(
    grid: readonly string[],
    rows: number,
    digits: string,
  ): boolean {
    if (!this.hasDownTeeth(grid) || !this.hasUpTeeth(grid)) {
      return false;
    }

    if (rows <= 2) {
      return !digits.includes("0");
    }

    const middle = grid.slice(1, -1).join("");
    return /^c+$/u.test(middle);
  }

  /** Whether one column is a spine with horizontal teeth and every other column holds only horizontal ticks. */
  private isVerticalComb(grid: readonly string[], columns: number): boolean {
    for (const column of Array.from({ length: columns }, (_, index) => index)) {
      const columnChars = grid.map((row) => row.at(column) || "").join("");
      if (
        columnChars &&
        /^[cde65a9]+$/u.test(columnChars) &&
        /[de]/u.test(columnChars)
      ) {
        const otherChars = grid
          .map((row) => row.slice(0, column) + row.slice(column + 1))
          .join("");
        if (/^[123]*$/u.test(otherChars)) {
          return true;
        }
      }
    }

    return false;
  }

  // 🌎 Public Methods

  /** Checks the unit is a well-formed comb of any of the three shapes and none of the excluded families. */
  public compute(context: CharacteristicContext): boolean {
    const { code } = context;

    if (
      !this.familyUtilitiesService.hasValidDimensions(code, 2) ||
      this.isBarsService.compute(context) ||
      this.isLinesService.compute(context) ||
      this.isMeshService.compute(context)
    ) {
      return false;
    }

    const grid = this.familyUtilitiesService.grid(code);

    return (
      this.isVerticalComb(grid, code.columns) ||
      this.isHorizontalComb(grid, code.rows) ||
      this.isReversingComb(grid, code.rows, code.digits)
    );
  }
}
