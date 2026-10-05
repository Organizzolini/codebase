import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of each positional form of the ر
 * (Arabic reh) skeleton — final and isolated — one per corner and clockwise
 * rotation, each counting that form's base template, which faces Southwest,
 * drawn that way. A letter sharing a form's skeleton, differing from it only by
 * dots or by other marks, is an alias of that form.
 */
@Injectable()
export class RehArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.formEvaluators([
      {
        aliases: {
          Southwest: "the final Arabic ز (zain)",
        },
        glyph: "ر (final Arabic reh)",
        key: (name) => `rehFinal${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a unit joining stroke running east from a one-step staircase that falls west to a unit tail, its curve drawn as an orthogonal zig-zag",
        template: this.finalTemplate,
      },
      {
        aliases: {
          Southwest: "the isolated Arabic ز (zain)",
        },
        glyph: "ر (isolated Arabic reh)",
        key: (name) => `rehIsolated${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a unit stroke dropping into a one-step staircase that falls west to a unit tail, its curve drawn as an orthogonal zig-zag",
        template: this.isolatedTemplate,
      },
    ]);
  }

  // 🔐 Private Fields

  /**
   * The upright ر (final Arabic reh) glyph's points as hexadecimal Code digits,
   * one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   *  ┌╴
   * ┌┘
   * ╵
   * ```
   */
  private readonly finalTemplate: readonly string[] = [".61", "69.", "8.."];

  /**
   * The upright ر (isolated Arabic reh) glyph's points as hexadecimal Code
   * digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   *  ╷
   * ┌┘
   * ╵
   * ```
   */
  private readonly isolatedTemplate: readonly string[] = [".4", "69", "8."];

  // 🔑 Public Fields

  /** One evaluator per form and orientation, `rehFinalSoutheastArabicCount` through `rehIsolatedNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
