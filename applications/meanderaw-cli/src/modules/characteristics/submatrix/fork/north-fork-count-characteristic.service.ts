import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the north forks of a Code — points whose ink leaves by
 * north, east, and west only, drawn ┴ — as a 1×1 submatrix scan. A fork is
 * named by its stem, the arm opposite the one it lacks.
 */
@Injectable()
export class NorthForkCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `northForkCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "submatrix",
    description:
      "The number of fork points whose ink leaves by north, east, and west only (┴).",
    formula: String.raw`\left|\{\, p \in M : \text{arms}(p) = \{N, E, W\} \,\}\right|`,
    key: "northForkCount",
    name: "North Fork Count",
    submatrix: { columns: 1, rows: 1 },
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Counts the points whose only arms are north, east, and west. */
  public compute(context: CharacteristicContext): number {
    return this.submatrixUtilitiesService.countPointsWithExactArms(
      context.matrix,
      ["east", "north", "west"],
    );
  }
}
