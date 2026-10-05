import { Inject, Injectable } from "@nestjs/common";

import { RunUtilitiesService } from "./run-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * The longest straight vertical run of ink anywhere in the Code. Rows never
 * wrap — the first and last rows sit against the band's own border rules —
 * so, unlike `longestHorizontalRunLength`, no cap is needed.
 */
@Injectable()
export class LongestVerticalRunLengthCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(RunUtilitiesService)
    private readonly runUtilitiesService: RunUtilitiesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `longestVerticalRunLength` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "submatrix",
    description:
      "The length of the longest straight vertical run of ink in any column. Rows do not wrap, so the run never crosses the band's own border rules.",
    formula: String.raw`\max_{c} \max \left\{\, k : \text{south}(r, c), \dots, \text{south}(r+k-1, c) \,\right\}`,
    key: "longestVerticalRunLength",
    name: "Longest Vertical Run Length",
    submatrix: { columns: 1, rows: 2, variable: true },
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Finds the longest vertical run over every column. */
  public compute(context: CharacteristicContext): number {
    return this.runUtilitiesService.longestVerticalRunLength(context.matrix);
  }
}
