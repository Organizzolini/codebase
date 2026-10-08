import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the north-west corners of a Code — points whose ink leaves by north
 * and west only, drawn ┘ — as a 1×1 submatrix scan. A corner is named by the
 * two arms it carries.
 */
@Injectable()
export class NorthWestCornerCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `northWestCornerCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "submatrix",
    description:
      "The number of corner points whose ink leaves by north and west only (┘).",
    formula: String.raw`\left|\{\, p \in M : \text{arms}(p) = \{N, W\} \,\}\right|`,
    key: "northWestCornerCount",
    name: "North-West Corner Count",
    submatrix: { columns: 1, rows: 1 },
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Counts the points whose only arms are north and west. */
  public compute(context: CharacteristicContext): number {
    return this.submatrixUtilitiesService.countPointsWithExactArms(
      context.matrix,
      ["north", "west"],
    );
  }
}
