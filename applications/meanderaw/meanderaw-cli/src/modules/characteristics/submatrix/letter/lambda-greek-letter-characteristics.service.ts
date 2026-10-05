import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the Λ (Greek lambda) glyph — a
 * two-point peak with a one-step staircase descending from each side to a unit
 * foot, its diagonals drawn as orthogonal zig-zags — one per corner and
 * clockwise rotation, each counting the base template drawn that way. The base
 * faces Southeast, drawn:
 *
 * ```text
 *  ┌┐
 * ┌┘└┐
 * ╵  ╵
 * ```
 */
@Injectable()
export class LambdaGreekLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      glyph: "Λ (Greek lambda)",
      key: (name) => `lambda${name}GreekCount`,
      script: "Greek",
      shape:
        "a two-point peak with a one-step staircase descending from each side to a unit foot, its diagonals drawn as orthogonal zig-zags",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [".65.", "69a5", "8..8"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `lambdaSoutheastGreekCount` through `lambdaNorthwestThreeQuarterGreekCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
