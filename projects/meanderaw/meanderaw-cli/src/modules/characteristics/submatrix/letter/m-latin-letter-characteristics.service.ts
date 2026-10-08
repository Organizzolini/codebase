import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the M glyph — three legs
 * hanging from a bar, the middle one half as long, legs pointing south — one
 * per corner and clockwise rotation, each counting the base template drawn
 * that way. The base faces Southeast, drawn:
 *
 * ```text
 * ┌┬┐
 * │╵│
 * ╵ ╵
 * ```
 */
@Injectable()
export class MLatinLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southeast: "the Greek Μ (mu)",
      },
      glyph: "M",
      key: (name) => `m${name}LatinCount`,
      script: "Latin",
      shape:
        "three legs hanging from a bar, the middle one half as long, legs pointing south",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["675", "c8c", "8.8"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `mSoutheastLatinCount` through `mNorthwestThreeQuarterLatinCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
