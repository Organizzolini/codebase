import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of each positional form of the ں
 * (Arabic dotless noon) skeleton — final and isolated — one per corner and
 * clockwise rotation, each counting that form's base template, which faces
 * Southwest, drawn that way. A letter sharing a form's skeleton, differing from
 * it only by dots or by other marks, is an alias of that form.
 */
@Injectable()
export class NoonArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.formEvaluators([
      {
        aliases: {
          Southwest: "the final Arabic ن (noon)",
        },
        glyph: "ں (final Arabic dotless noon)",
        key: (name) => `noonFinal${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a two-unit deep bowl with a two-unit tip rising at its west end, whose east side rises to a unit joining stroke",
        template: this.finalTemplate,
      },
      {
        aliases: {
          Southwest: "the isolated Arabic ن (noon)",
        },
        glyph: "ں (isolated Arabic dotless noon)",
        key: (name) => `noonIsolated${name}ArabicCount`,
        script: "Arabic",
        shape: "a bowl two units wide and two units deep, open to the north",
        template: this.isolatedTemplate,
      },
    ]);
  }

  // 🔐 Private Fields

  /**
   * The upright ں (final Arabic dotless noon) glyph's points as hexadecimal
   * Code digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   * ╷ ┌╴
   * │ │
   * └─┘
   * ```
   */
  private readonly finalTemplate: readonly string[] = ["4.61", "c.c.", "a39."];

  /**
   * The upright ں (isolated Arabic dotless noon) glyph's points as hexadecimal
   * Code digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   * ╷ ╷
   * │ │
   * └─┘
   * ```
   */
  private readonly isolatedTemplate: readonly string[] = ["4.4", "c.c", "a39"];

  // 🔑 Public Fields

  /** One evaluator per form and orientation, `noonFinalSoutheastArabicCount` through `noonIsolatedNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
