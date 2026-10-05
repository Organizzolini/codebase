import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the 由 (hanzi you) glyph — a
 * two-by-two grid of unit squares whose middle vertical stroke runs a unit
 * above its top — one per corner and clockwise rotation, each counting the
 * base template drawn that way. The base faces Southeast, drawn:
 *
 * ```text
 *  ╷
 * ┌┼┐
 * ├┼┤
 * └┴┘
 * ```
 */
@Injectable()
export class YouHanziLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      glyph: "由 (hanzi you)",
      key: (name) => `you${name}HanziCount`,
      script: "Hanzi",
      shape:
        "a two-by-two grid of unit squares whose middle vertical stroke runs a unit above its top",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [".4.", "6f5", "efd", "ab9"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `youSoutheastHanziCount` through `youNorthwestThreeQuarterHanziCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
