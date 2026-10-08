import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the O glyph — a closed unit
 * square — one per corner and clockwise rotation, each counting the base
 * template drawn that way. The base faces Southeast, drawn:
 *
 * ```text
 * ┌┐
 * └┘
 * ```
 */
@Injectable()
export class OLatinLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southeast:
          "the Greek Ο (omicron), the katakana ロ (ro), the hanzi 口 (kou), the hangul ㅁ (mieum), the Hebrew ם (final mem), and the isolated Arabic ه (heh) and ة (teh marbuta)",
      },
      glyph: "O",
      key: (name) => `o${name}LatinCount`,
      script: "Latin",
      shape: "a closed unit square",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["65", "a9"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `oSoutheastLatinCount` through `oNorthwestThreeQuarterLatinCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
