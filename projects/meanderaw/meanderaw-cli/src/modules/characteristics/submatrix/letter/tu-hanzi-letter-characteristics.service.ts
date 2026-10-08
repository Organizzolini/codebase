import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the 凸 (hanzi tu) glyph — the
 * outline of a unit square standing on the middle of a three-unit bar — one
 * per corner and clockwise rotation, each counting the base template drawn
 * that way. The base faces Southeast, drawn:
 *
 * ```text
 *  ┌┐
 * ┌┘└┐
 * └──┘
 * ```
 */
@Injectable()
export class TuHanziLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      glyph: "凸 (hanzi tu)",
      key: (name) => `tu${name}HanziCount`,
      script: "Hanzi",
      shape:
        "the outline of a unit square standing on the middle of a three-unit bar",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [".65.", "69a5", "a339"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `tuSoutheastHanziCount` through `tuNorthwestThreeQuarterHanziCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
