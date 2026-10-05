import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the F glyph — a spine with
 * prongs at one end and the middle, prongs pointing east — one per corner and
 * clockwise rotation, each counting the base template drawn that way. The base
 * faces Southeast, drawn:
 *
 * ```text
 * ┌╴
 * ├╴
 * ╵
 * ```
 */
@Injectable()
export class FLatinLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      glyph: "F",
      key: (name) => `f${name}LatinCount`,
      script: "Latin",
      shape:
        "a spine with prongs at one end and the middle, prongs pointing east",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["61", "e1", "8."];

  // 🔑 Public Fields

  /** One evaluator per orientation, `fSoutheastLatinCount` through `fNorthwestThreeQuarterLatinCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
