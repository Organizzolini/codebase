import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ㅠ (hangul yu) glyph — two
 * unit strokes dropping from the middle two points of a three-unit bar — one
 * per corner and clockwise rotation, each counting the base template drawn
 * that way. The base faces Southeast, drawn:
 *
 * ```text
 * ╶┬┬╴
 *  ╵╵
 * ```
 */
@Injectable()
export class YuHangulLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      glyph: "ㅠ (hangul yu)",
      key: (name) => `yu${name}HangulCount`,
      script: "Hangul",
      shape:
        "two unit strokes dropping from the middle two points of a three-unit bar",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["2771", ".88."];

  // 🔑 Public Fields

  /** One evaluator per orientation, `yuSoutheastHangulCount` through `yuNorthwestThreeQuarterHangulCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
