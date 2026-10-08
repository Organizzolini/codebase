import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the Y glyph — two arms
 * joining into a unit stem, stem pointing south — one per corner and clockwise
 * rotation, each counting the base template drawn that way. The base faces
 * Southeast, drawn:
 *
 * ```text
 * ╷ ╷
 * └┬┘
 *  ╵
 * ```
 */
@Injectable()
export class YLatinLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southeast: "the Greek Υ (upsilon)",
      },
      glyph: "Y",
      key: (name) => `y${name}LatinCount`,
      script: "Latin",
      shape: "two arms joining into a unit stem, stem pointing south",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["4.4", "a79", ".8."];

  // 🔑 Public Fields

  /** One evaluator per orientation, `ySoutheastLatinCount` through `yNorthwestThreeQuarterLatinCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
