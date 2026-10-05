import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of each positional form of the د
 * (Arabic dal) skeleton — final and isolated — one per corner and clockwise
 * rotation, each counting that form's base template, which faces Southwest,
 * drawn that way. A letter sharing a form's skeleton, differing from it only by
 * dots or by other marks, is an alias of that form.
 */
@Injectable()
export class DalArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.formEvaluators([
      {
        aliases: {
          Southwest: "the final Arabic ذ (thal)",
        },
        glyph: "د (final Arabic dal)",
        key: (name) => `dalFinal${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a unit head stroke above a three-unit baseline, joined to it by a unit stroke one unit short of its east end, where it joins east",
        template: this.finalTemplate,
      },
      {
        aliases: {
          Southwest: "the isolated Arabic ذ (thal)",
        },
        glyph: "د (isolated Arabic dal)",
        key: (name) => `dalIsolated${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a unit head stroke above a two-unit base stroke, their east ends joined by a unit stroke",
        template: this.isolatedTemplate,
      },
    ]);
  }

  // 🔐 Private Fields

  /**
   * The upright د (final Arabic dal) glyph's points as hexadecimal Code digits,
   * one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   *  ╶┐
   * ╶─┴╴
   * ```
   */
  private readonly finalTemplate: readonly string[] = [".25.", "23b1"];

  /**
   * The upright د (isolated Arabic dal) glyph's points as hexadecimal Code
   * digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   *  ╶┐
   * ╶─┘
   * ```
   */
  private readonly isolatedTemplate: readonly string[] = [".25", "239"];

  // 🔑 Public Fields

  /** One evaluator per form and orientation, `dalFinalSoutheastArabicCount` through `dalIsolatedNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
