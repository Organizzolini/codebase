import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the 目 (hanzi mu) glyph —
 * three unit squares stacked north to south, each sharing an edge with the
 * next — one per corner and clockwise rotation, each counting the base
 * template drawn that way. The base faces Southeast, drawn:
 *
 * ```text
 * ┌┐
 * ├┤
 * ├┤
 * └┘
 * ```
 */
@Injectable()
export class MuHanziLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      glyph: "目 (hanzi mu)",
      key: (name) => `mu${name}HanziCount`,
      script: "Hanzi",
      shape:
        "three unit squares stacked north to south, each sharing an edge with the next",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["65", "ed", "ed", "a9"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `muSoutheastHanziCount` through `muNorthwestThreeQuarterHanziCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
