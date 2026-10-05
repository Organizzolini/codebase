import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ㅋ (hangul kieuk) glyph —
 * two unit strokes reaching west from a two-unit stem, one from its top and
 * one from its middle — one per corner and clockwise rotation, each counting
 * the base template drawn that way. The base faces Southeast, drawn:
 *
 * ```text
 * ╶┐
 * ╶┤
 *  ╵
 * ```
 */
@Injectable()
export class KieukHangulLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        SoutheastHalf: "the katakana ヒ (hi)",
      },
      glyph: "ㅋ (hangul kieuk)",
      key: (name) => `kieuk${name}HangulCount`,
      script: "Hangul",
      shape:
        "two unit strokes reaching west from a two-unit stem, one from its top and one from its middle",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["25", "2d", ".8"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `kieukSoutheastHangulCount` through `kieukNorthwestThreeQuarterHangulCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
