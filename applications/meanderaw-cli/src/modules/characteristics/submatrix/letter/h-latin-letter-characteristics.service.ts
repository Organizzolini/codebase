import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the H glyph — two parallel
 * posts joined at their middles, posts vertical — one per corner and clockwise
 * rotation, each counting the base template drawn that way. The base faces
 * Southeast, drawn:
 *
 * ```text
 * ╷╷
 * ├┤
 * ╵╵
 * ```
 */
@Injectable()
export class HLatinLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southeast: "the Greek Η (eta) and the hangul ㅐ (ae)",
        SoutheastQuarter: "the hanzi 工 (gong) and the katakana エ (e)",
      },
      glyph: "H",
      key: (name) => `h${name}LatinCount`,
      script: "Latin",
      shape: "two parallel posts joined at their middles, posts vertical",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["44", "ed", "88"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `hSoutheastLatinCount` through `hNorthwestThreeQuarterLatinCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
