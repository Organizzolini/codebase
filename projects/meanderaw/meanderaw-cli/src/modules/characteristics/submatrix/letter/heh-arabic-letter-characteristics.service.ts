import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of each positional form of the ه
 * (Arabic heh) skeleton — final, initial, and medial — one per corner and
 * clockwise rotation, each counting that form's base template, which faces
 * Southwest, drawn that way. A letter sharing a form's skeleton, differing from
 * it only by dots or by other marks, is an alias of that form. The isolated
 * form draws the same glyph as the Latin O, so it is an alias there rather than
 * a form of its own.
 */
@Injectable()
export class HehArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.formEvaluators([
      {
        aliases: {
          Southwest: "the final Arabic ة (teh marbuta)",
        },
        glyph: "ه (final Arabic heh)",
        key: (name) => `hehFinal${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a two-unit-tall loop joined east from the middle of its east side",
        template: this.finalTemplate,
      },
      {
        glyph: "ه (initial Arabic heh)",
        key: (name) => `hehInitial${name}ArabicCount`,
        script: "Arabic",
        shape: "two stacked unit loops whose southwest corner joins west",
        template: this.initialTemplate,
      },
      {
        glyph: "ه (medial Arabic heh)",
        key: (name) => `hehMedial${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a unit loop above and a unit loop below a three-unit baseline that joins east and west",
        template: this.medialTemplate,
      },
    ]);
  }

  // 🔐 Private Fields

  /**
   * The upright ه (final Arabic heh) glyph's points as hexadecimal Code digits,
   * one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   * ┌┐
   * │├╴
   * └┘
   * ```
   */
  private readonly finalTemplate: readonly string[] = ["65.", "ce1", "a9."];

  /**
   * The upright ه (initial Arabic heh) glyph's points as hexadecimal Code
   * digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   *  ┌┐
   *  ├┤
   * ╶┴┘
   * ```
   */
  private readonly initialTemplate: readonly string[] = [".65", ".ed", "2b9"];

  /**
   * The upright ه (medial Arabic heh) glyph's points as hexadecimal Code
   * digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   *  ┌┐
   * ╶┼┼╴
   *  └┘
   * ```
   */
  private readonly medialTemplate: readonly string[] = [".65.", "2ff1", ".a9."];

  // 🔑 Public Fields

  /** One evaluator per form and orientation, `hehFinalSoutheastArabicCount` through `hehMedialNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
