import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the B glyph — two unit
 * squares sharing an edge, squares stacked north to south — one per corner and
 * clockwise rotation, each counting the base template drawn that way. The base
 * faces Southeast, drawn:
 *
 * ```text
 * ┌┐
 * ├┤
 * └┘
 * ```
 */
@Injectable()
export class BLatinLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southeast:
          "the Greek Β (beta), the Greek Θ (theta), and the hanzi 日 (ri)",
      },
      glyph: "B",
      key: (name) => `b${name}LatinCount`,
      script: "Latin",
      shape: "two unit squares sharing an edge, squares stacked north to south",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["65", "ed", "a9"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `bSoutheastLatinCount` through `bNorthwestThreeQuarterLatinCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
