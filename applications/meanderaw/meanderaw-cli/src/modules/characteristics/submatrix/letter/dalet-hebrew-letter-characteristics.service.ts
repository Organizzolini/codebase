import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ד (Hebrew dalet) glyph —
 * a three-unit roof with a unit leg dropping a unit short of its east end —
 * one per corner and clockwise rotation, each counting the base template drawn
 * that way. The base faces Southwest, drawn:
 *
 * ```text
 * ╶─┬╴
 *   ╵
 * ```
 */
@Injectable()
export class DaletHebrewLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      glyph: "ד (Hebrew dalet)",
      key: (name) => `dalet${name}HebrewCount`,
      script: "Hebrew",
      shape:
        "a three-unit roof with a unit leg dropping a unit short of its east end",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["2371", "..8."];

  // 🔑 Public Fields

  /** One evaluator per orientation, `daletSoutheastHebrewCount` through `daletNorthwestThreeQuarterHebrewCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
