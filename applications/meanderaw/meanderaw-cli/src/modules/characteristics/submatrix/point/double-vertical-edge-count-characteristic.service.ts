import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the points of a Code carrying both vertical arms and nothing else —
 * ink passing straight through north to south — as a 1×1 submatrix scan,
 * unlike `northEdgeCount` and `southEdgeCount`, which count one arm whatever else
 * the point carries.
 */
@Injectable()
export class DoubleVerticalEdgeCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `doubleVerticalEdgeCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "submatrix",
    description:
      "The number of points whose ink runs straight through north and south, with no east or west arm.",
    formula: String.raw`\left|\{\, p \in M : \text{arms}(p) = \{N, S\} \,\}\right|`,
    key: "doubleVerticalEdgeCount",
    name: "Double Vertical Edge Count",
    submatrix: { columns: 1, rows: 1 },
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Counts the points whose only arms are north and south. */
  public compute(context: CharacteristicContext): number {
    return this.submatrixUtilitiesService.countPointsWithExactArms(
      context.matrix,
      ["north", "south"],
    );
  }
}
