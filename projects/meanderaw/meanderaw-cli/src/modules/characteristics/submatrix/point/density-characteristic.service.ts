import { Inject, Injectable } from "@nestjs/common";

import { InkPointCountCharacteristicService } from "./ink-point-count-characteristic.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * The fraction of a Code's points that carry ink — `inkPointCount` divided
 * by the total point count, zero for a Code with no points at all. A ratio
 * rather than a tally, so it keeps its bare name instead of a `Count` suffix.
 */
@Injectable()
export class DensityCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(InkPointCountCharacteristicService)
    private readonly inkPointCountService: InkPointCountCharacteristicService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `density` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "submatrix",
    description:
      "The fraction of a Code's points that carry ink, zero when the Code has no points.",
    formula: String.raw`\frac{\text{inkPointCount}}{\text{rows} \cdot \text{columns}}`,
    key: "density",
    name: "Density",
    submatrix: { columns: 1, rows: 1 },
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Divides the inked point count by the total point count. */
  public compute(context: CharacteristicContext): number {
    const totalPoints = context.rows * context.columns;

    return totalPoints > 0
      ? this.inkPointCountService.compute(context) / totalPoints
      : 0;
  }
}
