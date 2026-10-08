import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of each positional form of the ى
 * (Arabic alef maksura, the dotless yeh) skeleton — final and isolated — one
 * per corner and clockwise rotation, each counting that form's base template,
 * which faces Southwest, drawn that way. A letter sharing a form's skeleton,
 * differing from it only by dots or by other marks, is an alias of that form.
 */
@Injectable()
export class YehArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.formEvaluators([
      {
        aliases: {
          Southwest: "the final Arabic ي (yeh) and ئ (yeh with hamza above)",
        },
        glyph: "ى (final Arabic alef maksura, the dotless yeh)",
        key: (name) => `yehFinal${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a two-unit joining stroke running east from a reversed hook over a three-unit bowl with a unit tip rising at its west end",
        template: this.finalTemplate,
      },
      {
        aliases: {
          Southwest: "the isolated Arabic ي (yeh) and ئ (yeh with hamza above)",
        },
        glyph: "ى (isolated Arabic alef maksura, the dotless yeh)",
        key: (name) => `yehIsolated${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a unit head stroke running east from a stroke that doubles back from the east, dropping into a three-unit bowl with a unit tip rising at its west end",
        template: this.isolatedTemplate,
      },
    ]);
  }

  // 🔐 Private Fields

  /**
   * The upright ى (final Arabic alef maksura, the dotless yeh) glyph's points
   * as hexadecimal Code digits, one string per row, `.` outside the glyph,
   * facing Southwest:
   *
   * ```text
   *   ┌─╴
   * ╷ └┐
   * └──┘
   * ```
   */
  private readonly finalTemplate: readonly string[] = [
    "..631",
    "4.a5.",
    "a339.",
  ];

  /**
   * The upright ى (isolated Arabic alef maksura, the dotless yeh) glyph's
   * points as hexadecimal Code digits, one string per row, `.` outside the
   * glyph, facing Southwest:
   *
   * ```text
   *   ┌╴
   * ╷ └┐
   * └──┘
   * ```
   */
  private readonly isolatedTemplate: readonly string[] = [
    "..61",
    "4.a5",
    "a339",
  ];

  // 🔑 Public Fields

  /** One evaluator per form and orientation, `yehFinalSoutheastArabicCount` through `yehIsolatedNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
