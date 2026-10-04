import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the points of a Code whose ink leaves south, whatever other arms
 * they carry — a lone arm, a straight edge, a corner, a fork, or a cross —
 * as a 1×1 submatrix scan.
 */
@Injectable()
export class SouthEdgeCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `southEdgeCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "submatrix",
    description:
      "The number of points carrying a south arm, whatever other arms they carry.",
    formula: String.raw`\left|\{\, p \in M : S \in \text{arms}(p) \,\}\right|`,
    key: "southEdgeCount",
    name: "South Edge Count",
    submatrix: { columns: 1, rows: 1 },
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Counts the points with a south arm. */
  public compute(context: CharacteristicContext): number {
    return this.submatrixUtilitiesService.countPointsWithArm(
      context.matrix,
      "south",
    );
  }
}
