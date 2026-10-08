import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the T glyph — a bar with a
 * unit stem from its middle, stem pointing south — one per corner and
 * clockwise rotation, each counting the base template drawn that way. The base
 * faces Southeast, drawn:
 *
 * ```text
 * ╶┬╴
 *  ╵
 * ```
 */
@Injectable()
export class TLatinLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southeast:
          "the Greek Τ (tau), the hanzi 丁 (ding), and the hangul ㅜ (u)",
        SoutheastHalf: "the hangul ㅗ (o)",
        SoutheastQuarter: "the hangul ㅓ (eo)",
        SoutheastThreeQuarter: "the katakana ト (to) and the hangul ㅏ (a)",
      },
      glyph: "T",
      key: (name) => `t${name}LatinCount`,
      script: "Latin",
      shape: "a bar with a unit stem from its middle, stem pointing south",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["271", ".8."];

  // 🔑 Public Fields

  /** One evaluator per orientation, `tSoutheastLatinCount` through `tNorthwestThreeQuarterLatinCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
