import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the final positional form of
 * the ا (Arabic alef) skeleton — one per corner and clockwise rotation, each
 * counting that form's base template, which faces Southwest, drawn that way. A
 * letter sharing the form's skeleton, differing from it only by its hamza or
 * madda, is an alias of that form. The isolated form draws the same glyph as
 * the Latin I, so it is an alias there rather than a form of its own.
 */
@Injectable()
export class AlefArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.formEvaluators([
      {
        aliases: {
          Southwest:
            "the final Arabic أ (alef with hamza above), إ (alef with hamza below), and آ (alef with madda above)",
        },
        glyph: "ا (final Arabic alef)",
        key: (name) => `alefFinal${name}ArabicCount`,
        script: "Arabic",
        shape: "a two-unit stem whose foot runs two units east to join",
        template: this.finalTemplate,
      },
    ]);
  }

  // 🔐 Private Fields

  /**
   * The upright ا (final Arabic alef) glyph's points as hexadecimal Code
   * digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   * ╷
   * │
   * └─╴
   * ```
   */
  private readonly finalTemplate: readonly string[] = ["4..", "c..", "a31"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `alefFinalSoutheastArabicCount` through `alefFinalNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
