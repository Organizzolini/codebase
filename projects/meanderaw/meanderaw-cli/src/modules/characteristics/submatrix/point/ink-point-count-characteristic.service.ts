import { Inject, Injectable } from "@nestjs/common";

import { PointUtilitiesService } from "./point-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts a Code's inked points — every point that carries at least one arm,
 * the complement of `dotCount` over the same grid.
 */
@Injectable()
export class InkPointCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(PointUtilitiesService)
    private readonly pointUtilitiesService: PointUtilitiesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `inkPointCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "submatrix",
    description:
      "The number of points that carry at least one arm of ink — every point that is not a bare dot.",
    formula: String.raw`\left|\{\, p \in M : \text{arms}(p) \neq \varnothing \,\}\right|`,
    key: "inkPointCount",
    name: "Ink Point Count",
    submatrix: { columns: 1, rows: 1 },
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Counts the points that carry at least one arm. */
  public compute(context: CharacteristicContext): number {
    let count = 0;

    for (const row of context.matrix) {
      for (const point of row) {
        if (this.pointUtilitiesService.armCount(point) > 0) {
          count += 1;
        }
      }
    }

    return count;
  }
}
