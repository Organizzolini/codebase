import { Inject, Injectable } from "@nestjs/common";

import { PointUtilitiesService } from "./point-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts a Code's edges — half the sum of every point's raw arm count, so an
 * edge shared by two points is not counted once from each end. A north or
 * south arm at the band's own border still tallies here even though it joins
 * nothing, which is why a single point with an odd arm count (a three-armed
 * junction, say) leaves this characteristic at a half-integer value.
 */
@Injectable()
export class EdgeCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(PointUtilitiesService)
    private readonly pointUtilitiesService: PointUtilitiesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `edgeCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "submatrix",
    description:
      "The number of edges a Code's ink carries, counted as half the sum of every point's own arm count.",
    formula: String.raw`\frac{1}{2} \sum_{p \in M} \left|\text{arms}(p)\right|`,
    key: "edgeCount",
    name: "Edge Count",
    submatrix: { columns: 1, rows: 1 },
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Sums every point's arm count and halves it. */
  public compute(context: CharacteristicContext): number {
    let degreeSum = 0;

    for (const row of context.matrix) {
      for (const point of row) {
        degreeSum += this.pointUtilitiesService.armCount(point);
      }
    }

    return degreeSum / 2;
  }
}
