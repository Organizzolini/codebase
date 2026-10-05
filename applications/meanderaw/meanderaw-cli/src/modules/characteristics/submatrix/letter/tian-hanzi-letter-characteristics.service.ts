import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the 田 (hanzi tian) glyph — a
 * two-by-two grid of unit squares — one per corner and clockwise rotation,
 * each counting the base template drawn that way. The base faces Southeast,
 * drawn:
 *
 * ```text
 * ┌┬┐
 * ├┼┤
 * └┴┘
 * ```
 */
@Injectable()
export class TianHanziLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      glyph: "田 (hanzi tian)",
      key: (name) => `tian${name}HanziCount`,
      script: "Hanzi",
      shape: "a two-by-two grid of unit squares",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["675", "efd", "ab9"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `tianSoutheastHanziCount` through `tianNorthwestThreeQuarterHanziCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
