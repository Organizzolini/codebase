import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ל (Hebrew lamed) glyph —
 * a unit step, a unit stroke rising from the west end of a unit stroke and
 * another dropping from its east end — one per corner and clockwise rotation,
 * each counting the base template drawn that way. The base faces Southwest,
 * drawn:
 *
 * ```text
 * ╷
 * └┐
 *  ╵
 * ```
 */
@Injectable()
export class LamedHebrewLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      glyph: "ל (Hebrew lamed)",
      key: (name) => `lamed${name}HebrewCount`,
      script: "Hebrew",
      shape:
        "a unit step, a unit stroke rising from the west end of a unit stroke and another dropping from its east end",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["4.", "a5", ".8"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `lamedSoutheastHebrewCount` through `lamedNorthwestThreeQuarterHebrewCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
