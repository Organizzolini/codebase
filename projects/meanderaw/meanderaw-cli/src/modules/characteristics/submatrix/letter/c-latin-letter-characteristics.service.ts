import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the C glyph — a unit square
 * missing one side, open to the east — one per corner and clockwise rotation,
 * each counting the base template drawn that way. The base faces Southeast,
 * drawn:
 *
 * ```text
 * ┌╴
 * └╴
 * ```
 */
@Injectable()
export class CLatinLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southeast: "the hanzi 匚 (fang) and the hangul ㄷ (digeut)",
        SoutheastHalf: "the katakana コ (ko) and the Hebrew כ (kaf)",
      },
      glyph: "C",
      key: (name) => `c${name}LatinCount`,
      script: "Latin",
      shape: "a unit square missing one side, open to the east",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["61", "a1"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `cSoutheastLatinCount` through `cNorthwestThreeQuarterLatinCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
