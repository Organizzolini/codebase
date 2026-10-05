import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of each positional form of the س
 * (Arabic seen) skeleton — final, initial, isolated, and medial — one per
 * corner and clockwise rotation, each counting that form's base template, which
 * faces Southwest, drawn that way. A letter sharing a form's skeleton,
 * differing from it only by dots or by other marks, is an alias of that form.
 */
@Injectable()
export class SeenArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.formEvaluators([
      {
        aliases: {
          Southwest: "the final Arabic ش (sheen)",
        },
        glyph: "س (final Arabic seen)",
        key: (name) => `seenFinal${name}ArabicCount`,
        script: "Arabic",
        shape:
          "three unit teeth on a four-unit baseline that joins east and whose west end drops into a two-unit bowl with a unit tip rising at its west end",
        template: this.finalTemplate,
      },
      {
        aliases: {
          Southwest: "the initial Arabic ش (sheen)",
        },
        glyph: "س (initial Arabic seen)",
        key: (name) => `seenInitial${name}ArabicCount`,
        script: "Arabic",
        shape:
          "three unit teeth on a three-unit baseline whose west end joins west",
        template: this.initialTemplate,
      },
      {
        aliases: {
          Southwest: "the isolated Arabic ش (sheen)",
        },
        glyph: "س (isolated Arabic seen)",
        key: (name) => `seenIsolated${name}ArabicCount`,
        script: "Arabic",
        shape:
          "three unit teeth on a three-unit baseline whose west end drops into a two-unit bowl with a unit tip rising at its west end",
        template: this.isolatedTemplate,
      },
      {
        aliases: {
          Southwest: "the medial Arabic ش (sheen)",
        },
        glyph: "س (medial Arabic seen)",
        key: (name) => `seenMedial${name}ArabicCount`,
        script: "Arabic",
        shape:
          "three unit teeth on a four-unit baseline that joins east and west",
        template: this.medialTemplate,
      },
    ]);
  }

  // 🔐 Private Fields

  /**
   * The upright س (final Arabic seen) glyph's points as hexadecimal Code
   * digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   *    ╷╷╷
   * ╷ ┌┴┴┴╴
   * └─┘
   * ```
   */
  private readonly finalTemplate: readonly string[] = [
    "...444.",
    "4.6bbb1",
    "a39....",
  ];

  /**
   * The upright س (initial Arabic seen) glyph's points as hexadecimal Code
   * digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   *  ╷╷╷
   * ╶┴┴┘
   * ```
   */
  private readonly initialTemplate: readonly string[] = [".444", "2bb9"];

  /**
   * The upright س (isolated Arabic seen) glyph's points as hexadecimal Code
   * digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   *    ╷╷╷
   * ╷ ┌┴┴┘
   * └─┘
   * ```
   */
  private readonly isolatedTemplate: readonly string[] = [
    "...444",
    "4.6bb9",
    "a39...",
  ];

  /**
   * The upright س (medial Arabic seen) glyph's points as hexadecimal Code
   * digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   *  ╷╷╷
   * ╶┴┴┴╴
   * ```
   */
  private readonly medialTemplate: readonly string[] = [".444.", "2bbb1"];

  // 🔑 Public Fields

  /** One evaluator per form and orientation, `seenFinalSoutheastArabicCount` through `seenMedialNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
