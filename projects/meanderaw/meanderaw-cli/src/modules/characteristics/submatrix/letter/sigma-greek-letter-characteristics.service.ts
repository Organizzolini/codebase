import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the Σ (Greek sigma) glyph — a
 * two-unit bar above and below, joined by a one-step staircase from each bar's
 * west end out to an east vertex between them, its diagonals drawn as
 * orthogonal zig-zags — one per corner and clockwise rotation, each counting
 * the base template drawn that way. The base faces Southeast, drawn:
 *
 * ```text
 * ┌─╴
 * └┐
 * ┌┘
 * └─╴
 * ```
 */
@Injectable()
export class SigmaGreekLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      glyph: "Σ (Greek sigma)",
      key: (name) => `sigma${name}GreekCount`,
      script: "Greek",
      shape:
        "a two-unit bar above and below, joined by a one-step staircase from each bar's west end out to an east vertex between them, its diagonals drawn as orthogonal zig-zags",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["631", "a5.", "69.", "a31"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `sigmaSoutheastGreekCount` through `sigmaNorthwestThreeQuarterGreekCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
