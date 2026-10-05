import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the 凹 (hanzi ao) glyph — the
 * outline of a three-unit bar with a unit notch cut into the middle of its top
 * — one per corner and clockwise rotation, each counting the base template
 * drawn that way. The base faces Southeast, drawn:
 *
 * ```text
 * ┌┐┌┐
 * │└┘│
 * └──┘
 * ```
 */
@Injectable()
export class AoHanziLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      glyph: "凹 (hanzi ao)",
      key: (name) => `ao${name}HanziCount`,
      script: "Hanzi",
      shape:
        "the outline of a three-unit bar with a unit notch cut into the middle of its top",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["6565", "ca9c", "a339"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `aoSoutheastHanziCount` through `aoNorthwestThreeQuarterHanziCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
