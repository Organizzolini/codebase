import { Inject, Injectable } from "@nestjs/common";

import { RunUtilitiesService } from "./run-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * The longest straight horizontal run of ink anywhere in the Code, wrapping
 * each row around its own column span so a run may continue across the tile
 * crossing, and capped at the Code's column count.
 */
@Injectable()
export class LongestHorizontalRunLengthCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(RunUtilitiesService)
    private readonly runUtilitiesService: RunUtilitiesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `longestHorizontalRunLength` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "submatrix",
    description:
      "The length of the longest straight horizontal run of ink, wrapping each row around the tile's own column span and capped at the column count.",
    formula: String.raw`\min\!\left(\text{columns},\ \max_{r} \max \left\{\, k : \text{east}(r, c), \dots, \text{east}(r, c+k-1) \,\right\}\right)`,
    key: "longestHorizontalRunLength",
    name: "Longest Horizontal Run Length",
    submatrix: { columns: 2, rows: 1, variable: true },
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Finds the longest wrapped horizontal run over every row. */
  public compute(context: CharacteristicContext): number {
    return this.runUtilitiesService.longestHorizontalRunLength(context.matrix);
  }
}
