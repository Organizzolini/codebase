import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the S glyph — three bars
 * joined into a serpentine, bars horizontal — one per corner and clockwise
 * rotation, each counting the base template drawn that way. The base faces
 * Southeast, drawn:
 *
 * ```text
 * ┌╴
 * └┐
 * ╶┘
 * ```
 */
@Injectable()
export class SLatinLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      glyph: "S",
      key: (name) => `s${name}LatinCount`,
      script: "Latin",
      shape: "three bars joined into a serpentine, bars horizontal",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["61", "a5", "29"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `sSoutheastLatinCount` through `sNorthwestThreeQuarterLatinCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
