import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of each positional form of the ٯ
 * (Arabic dotless qaf) skeleton — final and isolated — one per corner and
 * clockwise rotation, each counting that form's base template, which faces
 * Southwest, drawn that way. A letter sharing a form's skeleton, differing from
 * it only by dots or by other marks, is an alias of that form.
 */
@Injectable()
export class QafArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.formEvaluators([
      {
        aliases: {
          Southwest: "the final Arabic ق (qaf)",
        },
        glyph: "ٯ (final Arabic dotless qaf)",
        key: (name) => `qafFinal${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a unit loop whose east corner joins east, set on a two-unit bowl below it with a unit tip rising at its west end",
        template: this.finalTemplate,
      },
      {
        aliases: {
          Southwest: "the isolated Arabic ق (qaf)",
        },
        glyph: "ٯ (isolated Arabic dotless qaf)",
        key: (name) => `qafIsolated${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a unit loop whose southwest corner drops into a two-unit bowl with a unit tip rising at its west end",
        template: this.isolatedTemplate,
      },
    ]);
  }

  // 🔐 Private Fields

  /**
   * The upright ٯ (final Arabic dotless qaf) glyph's points as hexadecimal Code
   * digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   *   ┌┐
   * ╷ ├┴╴
   * └─┘
   * ```
   */
  private readonly finalTemplate: readonly string[] = [
    "..65.",
    "4.eb1",
    "a39..",
  ];

  /**
   * The upright ٯ (isolated Arabic dotless qaf) glyph's points as hexadecimal
   * Code digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   *   ┌┐
   * ╷ ├┘
   * └─┘
   * ```
   */
  private readonly isolatedTemplate: readonly string[] = [
    "..65",
    "4.e9",
    "a39.",
  ];

  // 🔑 Public Fields

  /** One evaluator per form and orientation, `qafFinalSoutheastArabicCount` through `qafIsolatedNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
