import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the points of a Code carrying both horizontal arms and nothing else —
 * ink passing straight through east to west — as a 1×1 submatrix scan,
 * unlike `eastEdgeCount` and `westEdgeCount`, which count one arm whatever else
 * the point carries.
 */
@Injectable()
export class DoubleHorizontalEdgeCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `doubleHorizontalEdgeCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "submatrix",
    description:
      "The number of points whose ink runs straight through east and west, with no north or south arm.",
    formula: String.raw`\left|\{\, p \in M : \text{arms}(p) = \{E, W\} \,\}\right|`,
    key: "doubleHorizontalEdgeCount",
    name: "Double Horizontal Edge Count",
    submatrix: { columns: 1, rows: 1 },
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Counts the points whose only arms are east and west. */
  public compute(context: CharacteristicContext): number {
    return this.submatrixUtilitiesService.countPointsWithExactArms(
      context.matrix,
      ["east", "west"],
    );
  }
}
