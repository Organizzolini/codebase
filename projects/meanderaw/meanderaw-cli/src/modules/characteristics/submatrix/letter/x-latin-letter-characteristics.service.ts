import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the X glyph — four unit arms
 * from one crossing — one per corner and clockwise rotation, each counting the
 * base template drawn that way. The base faces Southeast, drawn:
 *
 * ```text
 *  ╷
 * ╶┼╴
 *  ╵
 * ```
 */
@Injectable()
export class XLatinLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southeast: "the Greek Χ (chi) and the hanzi 十 (shi)",
      },
      glyph: "X",
      key: (name) => `x${name}LatinCount`,
      script: "Latin",
      shape: "four unit arms from one crossing",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [".4.", "2f1", ".8."];

  // 🔑 Public Fields

  /** One evaluator per orientation, `xSoutheastLatinCount` through `xNorthwestThreeQuarterLatinCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
