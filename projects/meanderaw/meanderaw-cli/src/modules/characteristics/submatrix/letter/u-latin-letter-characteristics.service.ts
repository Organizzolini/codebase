import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the U glyph — a unit square
 * missing one side, open to the north — one per corner and clockwise rotation,
 * each counting the base template drawn that way. The base faces Southeast,
 * drawn:
 *
 * ```text
 * ╷╷
 * └┘
 * ```
 */
@Injectable()
export class ULatinLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southeast: "the hanzi 凵 (kan)",
        SoutheastHalf: "the Greek Π (pi) and the Hebrew ח (het)",
      },
      glyph: "U",
      key: (name) => `u${name}LatinCount`,
      script: "Latin",
      shape: "a unit square missing one side, open to the north",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["44", "a9"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `uSoutheastLatinCount` through `uNorthwestThreeQuarterLatinCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
