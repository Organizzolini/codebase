import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the E glyph — a spine with
 * three equal prongs, prongs pointing east — one per corner and clockwise
 * rotation, each counting the base template drawn that way. The base faces
 * Southeast, drawn:
 *
 * ```text
 * ┌╴
 * ├╴
 * └╴
 * ```
 */
@Injectable()
export class ELatinLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southeast: "the Greek Ε (epsilon) and the hangul ㅌ (tieut)",
        SoutheastHalf: "the katakana ヨ (yo)",
        SoutheastThreeQuarter: "the hanzi 山 (shan)",
      },
      glyph: "E",
      key: (name) => `e${name}LatinCount`,
      script: "Latin",
      shape: "a spine with three equal prongs, prongs pointing east",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["61", "e1", "a1"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `eSoutheastLatinCount` through `eNorthwestThreeQuarterLatinCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
