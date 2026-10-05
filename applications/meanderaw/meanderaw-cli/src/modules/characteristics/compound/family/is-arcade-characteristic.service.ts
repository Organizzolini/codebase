import { Inject, Injectable } from "@nestjs/common";

import { FamilyUtilitiesService } from "./family-utilities.service";
import { IsBarsCharacteristicService } from "./is-bars-characteristic.service";
import { IsCombCharacteristicService } from "./is-comb-characteristic.service";
import { IsMeshCharacteristicService } from "./is-mesh-characteristic.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Whether a Code's repeating unit is an arcade — top and bottom rails joined
 * by at least two continuous vertical through-pillars, forming bays or
 * arches. Bars, mesh, and comb are excluded, since each also joins its rails
 * with pillars.
 */
@Injectable()
export class IsArcadeCharacteristicService implements CharacteristicEvaluator<boolean> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(FamilyUtilitiesService)
    private readonly familyUtilitiesService: FamilyUtilitiesService,
    @Inject(IsBarsCharacteristicService)
    private readonly isBarsService: IsBarsCharacteristicService,
    @Inject(IsCombCharacteristicService)
    private readonly isCombService: IsCombCharacteristicService,
    @Inject(IsMeshCharacteristicService)
    private readonly isMeshService: IsMeshCharacteristicService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `isArcade` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "compound",
    description:
      "Whether the repeating unit spans at least three rows and joins a downward-connecting top rail to an upward-connecting bottom rail with at least two unbroken vertical pillars, without being bars, mesh, or comb.",
    formula: String.raw`\text{rows} \geq 3 \wedge \left|\{\, j : \text{top}_j \in \{5,6,7\} \wedge \text{bottom}_j \in \{9,\text{a},\text{b}\} \wedge \text{middle}_j = \text{c} \,\}\right| \geq 2 \wedge \neg\,\text{isBars} \wedge \neg\,\text{isMesh} \wedge \neg\,\text{isComb}`,
    key: "isArcade",
    name: "Is Arcade",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  /**
   * How many columns run an unbroken pillar from a downward connector on the
   * top rail to an upward connector on the bottom rail — none at all unless
   * each rail connects that way somewhere along the unit.
   */
  private countPillars(grid: readonly string[]): number {
    const topRow = grid.at(0) ?? "";
    const bottomRow = grid.at(-1) ?? "";

    if (!/[765]/u.test(topRow) || !/[ba9]/u.test(bottomRow)) {
      return 0;
    }

    const middleRows = grid.slice(1, -1);

    return Array.from({ length: topRow.length }, (_, column) => {
      const topCharacter = topRow.at(column);
      const bottomCharacter = bottomRow.at(column);
      return topCharacter &&
        bottomCharacter &&
        /[765]/u.test(topCharacter) &&
        /[ba9]/u.test(bottomCharacter) &&
        middleRows.every((row) => row.at(column) === "c")
        ? 1
        : 0;
    }).reduce((a: number, b) => a + b, 0);
  }

  // 🌎 Public Methods

  /** Checks the unit is a well-formed arcade with at least two through-pillars and none of the excluded families. */
  public compute(context: CharacteristicContext): boolean {
    const { code } = context;

    if (
      !this.familyUtilitiesService.hasValidDimensions(code, 3) ||
      this.isBarsService.compute(context) ||
      this.isMeshService.compute(context) ||
      this.isCombService.compute(context)
    ) {
      return false;
    }

    return this.countPillars(this.familyUtilitiesService.grid(code)) >= 2;
  }
}
