import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the Κ (Greek kappa) glyph — a
 * four-unit stem with a unit branch from its middle forking into a one-step
 * staircase rising east and another falling east, its diagonals drawn as
 * orthogonal zig-zags — one per corner and clockwise rotation, each counting
 * the base template drawn that way. The base faces Southeast, drawn:
 *
 * ```text
 * ╷ ╷
 * │┌┘
 * ├┤
 * │└┐
 * ╵ ╵
 * ```
 */
@Injectable()
export class KappaGreekLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      glyph: "Κ (Greek kappa)",
      key: (name) => `kappa${name}GreekCount`,
      script: "Greek",
      shape:
        "a four-unit stem with a unit branch from its middle forking into a one-step staircase rising east and another falling east, its diagonals drawn as orthogonal zig-zags",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [
    "4.4",
    "c69",
    "ed.",
    "ca5",
    "8.8",
  ];

  // 🔑 Public Fields

  /** One evaluator per orientation, `kappaSoutheastGreekCount` through `kappaNorthwestThreeQuarterGreekCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
