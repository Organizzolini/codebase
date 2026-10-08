import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of each positional form of the ڡ
 * (Arabic dotless feh) skeleton — final, initial, isolated, and medial — one
 * per corner and clockwise rotation, each counting that form's base template,
 * which faces Southwest, drawn that way. A letter sharing a form's skeleton,
 * differing from it only by dots or by other marks, is an alias of that form.
 */
@Injectable()
export class FehArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.formEvaluators([
      {
        aliases: {
          Southwest: "the final Arabic ف (feh)",
        },
        glyph: "ڡ (final Arabic dotless feh)",
        key: (name) => `fehFinal${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a unit loop on a four-unit baseline that joins east, with a unit tip rising at its west end",
        template: this.finalTemplate,
      },
      {
        aliases: {
          Southwest: "the initial Arabic ف (feh), ٯ (dotless qaf), and ق (qaf)",
        },
        glyph: "ڡ (initial Arabic dotless feh)",
        key: (name) => `fehInitial${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a unit loop raised on a unit neck at its east side, whose foot runs two units west to join",
        template: this.initialTemplate,
      },
      {
        aliases: {
          Southwest: "the isolated Arabic ف (feh)",
        },
        glyph: "ڡ (isolated Arabic dotless feh)",
        key: (name) => `fehIsolated${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a unit loop at the east end of a three-unit baseline with a unit tip rising at its west end",
        template: this.isolatedTemplate,
      },
      {
        aliases: {
          Southwest: "the medial Arabic ف (feh), ٯ (dotless qaf), and ق (qaf)",
        },
        glyph: "ڡ (medial Arabic dotless feh)",
        key: (name) => `fehMedial${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a unit loop raised on a unit neck at its east side, standing on a three-unit baseline that joins east and west",
        template: this.medialTemplate,
      },
    ]);
  }

  // 🔐 Private Fields

  /**
   * The upright ڡ (final Arabic dotless feh) glyph's points as hexadecimal Code
   * digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   * ╷ ┌┐
   * └─┴┴╴
   * ```
   */
  private readonly finalTemplate: readonly string[] = ["4.65.", "a3bb1"];

  /**
   * The upright ڡ (initial Arabic dotless feh) glyph's points as hexadecimal
   * Code digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   *  ┌┐
   *  └┤
   * ╶─┘
   * ```
   */
  private readonly initialTemplate: readonly string[] = [".65", ".ad", "239"];

  /**
   * The upright ڡ (isolated Arabic dotless feh) glyph's points as hexadecimal
   * Code digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   * ╷ ┌┐
   * └─┴┘
   * ```
   */
  private readonly isolatedTemplate: readonly string[] = ["4.65", "a3b9"];

  /**
   * The upright ڡ (medial Arabic dotless feh) glyph's points as hexadecimal
   * Code digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   *  ┌┐
   *  └┤
   * ╶─┴╴
   * ```
   */
  private readonly medialTemplate: readonly string[] = [".65.", ".ad.", "23b1"];

  // 🔑 Public Fields

  /** One evaluator per form and orientation, `fehFinalSoutheastArabicCount` through `fehMedialNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
