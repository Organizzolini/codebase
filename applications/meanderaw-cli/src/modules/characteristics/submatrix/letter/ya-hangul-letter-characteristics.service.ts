import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ㅑ (hangul ya) glyph — two
 * unit strokes reaching east from the middle two points of a three-unit stem —
 * one per corner and clockwise rotation, each counting the base template drawn
 * that way. The base faces Southeast, drawn:
 *
 * ```text
 * ╷
 * ├╴
 * ├╴
 * ╵
 * ```
 */
@Injectable()
export class YaHangulLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      glyph: "ㅑ (hangul ya)",
      key: (name) => `ya${name}HangulCount`,
      script: "Hangul",
      shape:
        "two unit strokes reaching east from the middle two points of a three-unit stem",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["4.", "e1", "e1", "8."];

  // 🔑 Public Fields

  /** One evaluator per orientation, `yaSoutheastHangulCount` through `yaNorthwestThreeQuarterHangulCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
