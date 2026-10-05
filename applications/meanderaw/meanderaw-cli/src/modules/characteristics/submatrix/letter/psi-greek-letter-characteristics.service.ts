import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the Ψ (Greek psi) glyph — a
 * two-unit bar with a unit prong rising from each end and from its middle, the
 * middle prong running on a unit below the bar as a stem — one per corner and
 * clockwise rotation, each counting the base template drawn that way. The base
 * faces Southeast, drawn:
 *
 * ```text
 * ╷╷╷
 * └┼┘
 *  ╵
 * ```
 */
@Injectable()
export class PsiGreekLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      glyph: "Ψ (Greek psi)",
      key: (name) => `psi${name}GreekCount`,
      script: "Greek",
      shape:
        "a two-unit bar with a unit prong rising from each end and from its middle, the middle prong running on a unit below the bar as a stem",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["444", "af9", ".8."];

  // 🔑 Public Fields

  /** One evaluator per orientation, `psiSoutheastGreekCount` through `psiNorthwestThreeQuarterGreekCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
