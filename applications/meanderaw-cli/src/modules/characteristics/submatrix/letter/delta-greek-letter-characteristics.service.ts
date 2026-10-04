import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the Δ (Greek delta) glyph — a
 * closed triangle: a two-point peak with a two-step staircase descending from
 * each side to a five-unit base, its diagonals drawn as orthogonal zig-zags —
 * one per corner and clockwise rotation, each counting the base template drawn
 * that way. The base faces Southeast, drawn:
 *
 * ```text
 *   ┌┐
 *  ┌┘└┐
 * ┌┘  └┐
 * └────┘
 * ```
 */
@Injectable()
export class DeltaGreekLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      glyph: "Δ (Greek delta)",
      key: (name) => `delta${name}GreekCount`,
      script: "Greek",
      shape:
        "a closed triangle: a two-point peak with a two-step staircase descending from each side to a five-unit base, its diagonals drawn as orthogonal zig-zags",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [
    "..65..",
    ".69a5.",
    "69..a5",
    "a33339",
  ];

  // 🔑 Public Fields

  /** One evaluator per orientation, `deltaSoutheastGreekCount` through `deltaNorthwestThreeQuarterGreekCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
