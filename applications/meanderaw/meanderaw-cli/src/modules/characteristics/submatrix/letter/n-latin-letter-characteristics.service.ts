import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the N glyph — two posts
 * joined by a stepped diagonal, posts vertical — one per corner and clockwise
 * rotation, each counting the base template drawn that way. The base faces
 * Southeast, drawn:
 *
 * ```text
 * ┌┐╷
 * │││
 * ╵└┘
 * ```
 */
@Injectable()
export class NLatinLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southeast: "the Greek Ν (nu)",
      },
      glyph: "N",
      key: (name) => `n${name}LatinCount`,
      script: "Latin",
      shape: "two posts joined by a stepped diagonal, posts vertical",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["654", "ccc", "8a9"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `nSoutheastLatinCount` through `nNorthwestThreeQuarterLatinCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
