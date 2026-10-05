import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of each positional form of the ٮ
 * (Arabic dotless beh) skeleton — final, initial, isolated, and medial — one
 * per corner and clockwise rotation, each counting that form's base template,
 * which faces Southwest, drawn that way. A letter sharing a form's skeleton,
 * differing from it only by dots or by other marks, is an alias of that form.
 */
@Injectable()
export class BehArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.formEvaluators([
      {
        aliases: {
          Southwest: "the final Arabic ب (beh), ت (teh), and ث (theh)",
        },
        glyph: "ٮ (final Arabic dotless beh)",
        key: (name) => `behFinal${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a unit tip rising from the west end of a two-unit baseline that joins east, a shallow bowl open to the north",
        template: this.finalTemplate,
      },
      {
        aliases: {
          Southwest:
            "the initial Arabic ب (beh), ت (teh), ث (theh), ن (noon), ي (yeh), and ئ (yeh with hamza above)",
        },
        glyph: "ٮ (initial Arabic dotless beh)",
        key: (name) => `behInitial${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a unit tooth rising from the east end of a unit joining stroke that runs west",
        template: this.initialTemplate,
      },
      {
        aliases: {
          Southwest: "the isolated Arabic ب (beh), ت (teh), and ث (theh)",
        },
        glyph: "ٮ (isolated Arabic dotless beh)",
        key: (name) => `behIsolated${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a two-unit baseline with a unit tip rising from each end, a shallow bowl open to the north",
        template: this.isolatedTemplate,
      },
      {
        aliases: {
          Southwest:
            "the medial Arabic ب (beh), ت (teh), ث (theh), ن (noon), ي (yeh), and ئ (yeh with hamza above)",
        },
        glyph: "ٮ (medial Arabic dotless beh)",
        key: (name) => `behMedial${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a unit tooth rising from the middle of a two-unit baseline that joins both east and west",
        template: this.medialTemplate,
      },
    ]);
  }

  // 🔐 Private Fields

  /**
   * The upright ٮ (final Arabic dotless beh) glyph's points as hexadecimal Code
   * digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   * ╷
   * └─╴
   * ```
   */
  private readonly finalTemplate: readonly string[] = ["4..", "a31"];

  /**
   * The upright ٮ (initial Arabic dotless beh) glyph's points as hexadecimal
   * Code digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   *  ╷
   * ╶┘
   * ```
   */
  private readonly initialTemplate: readonly string[] = [".4", "29"];

  /**
   * The upright ٮ (isolated Arabic dotless beh) glyph's points as hexadecimal
   * Code digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   * ╷ ╷
   * └─┘
   * ```
   */
  private readonly isolatedTemplate: readonly string[] = ["4.4", "a39"];

  /**
   * The upright ٮ (medial Arabic dotless beh) glyph's points as hexadecimal
   * Code digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   *  ╷
   * ╶┴╴
   * ```
   */
  private readonly medialTemplate: readonly string[] = [".4.", "2b1"];

  // 🔑 Public Fields

  /** One evaluator per form and orientation, `behFinalSoutheastArabicCount` through `behMedialNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
