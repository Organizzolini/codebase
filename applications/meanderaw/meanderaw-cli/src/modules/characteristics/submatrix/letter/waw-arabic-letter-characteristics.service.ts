import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of each positional form of the و
 * (Arabic waw) skeleton — final and isolated — one per corner and clockwise
 * rotation, each counting that form's base template, which faces Southwest,
 * drawn that way. A letter sharing a form's skeleton, differing from it only by
 * dots or by other marks, is an alias of that form.
 */
@Injectable()
export class WawArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.formEvaluators([
      {
        aliases: {
          Southwest: "the final Arabic ؤ (waw with hamza above)",
        },
        glyph: "و (final Arabic waw)",
        key: (name) => `wawFinal${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a unit loop whose southeast corner joins east, dropping into a one-step staircase that falls west to a unit tail, its curve drawn as an orthogonal zig-zag",
        template: this.finalTemplate,
      },
      {
        aliases: {
          Southwest: "the isolated Arabic ؤ (waw with hamza above)",
        },
        glyph: "و (isolated Arabic waw)",
        key: (name) => `wawIsolated${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a unit loop whose southeast corner drops into a one-step staircase that falls west to a unit tail, its curve drawn as an orthogonal zig-zag",
        template: this.isolatedTemplate,
      },
    ]);
  }

  // 🔐 Private Fields

  /**
   * The upright و (final Arabic waw) glyph's points as hexadecimal Code digits,
   * one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   * ┌┐
   * └┼╴
   * ┌┘
   * ╵
   * ```
   */
  private readonly finalTemplate: readonly string[] = [
    "65.",
    "af1",
    "69.",
    "8..",
  ];

  /**
   * The upright و (isolated Arabic waw) glyph's points as hexadecimal Code
   * digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   * ┌┐
   * └┤
   * ┌┘
   * ╵
   * ```
   */
  private readonly isolatedTemplate: readonly string[] = [
    "65",
    "ad",
    "69",
    "8.",
  ];

  // 🔑 Public Fields

  /** One evaluator per form and orientation, `wawFinalSoutheastArabicCount` through `wawIsolatedNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
