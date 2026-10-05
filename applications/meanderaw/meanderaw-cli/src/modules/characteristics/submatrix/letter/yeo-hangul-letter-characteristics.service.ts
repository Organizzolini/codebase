import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ㅕ (hangul yeo) glyph —
 * two unit strokes reaching west from the middle two points of a three-unit
 * stem — one per corner and clockwise rotation, each counting the base
 * template drawn that way. The base faces Southeast, drawn:
 *
 * ```text
 *  ╷
 * ╶┤
 * ╶┤
 *  ╵
 * ```
 */
@Injectable()
export class YeoHangulLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      glyph: "ㅕ (hangul yeo)",
      key: (name) => `yeo${name}HangulCount`,
      script: "Hangul",
      shape:
        "two unit strokes reaching west from the middle two points of a three-unit stem",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [".4", "2d", "2d", ".8"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `yeoSoutheastHangulCount` through `yeoNorthwestThreeQuarterHangulCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
