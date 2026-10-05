import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of each positional form of the ص
 * (Arabic sad) skeleton — final, initial, isolated, and medial — one per corner
 * and clockwise rotation, each counting that form's base template, which faces
 * Southwest, drawn that way. A letter sharing a form's skeleton, differing from
 * it only by dots or by other marks, is an alias of that form.
 */
@Injectable()
export class SadArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.formEvaluators([
      {
        aliases: {
          Southwest: "the final Arabic ض (dad)",
        },
        glyph: "ص (final Arabic sad)",
        key: (name) => `sadFinal${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a unit loop east of a unit tooth on a four-unit baseline that joins east and whose west end drops into a two-unit bowl with a unit tip rising at its west end",
        template: this.finalTemplate,
      },
      {
        aliases: {
          Southwest: "the initial Arabic ض (dad)",
        },
        glyph: "ص (initial Arabic sad)",
        key: (name) => `sadInitial${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a unit loop east of a unit tooth on a three-unit baseline whose west end joins west",
        template: this.initialTemplate,
      },
      {
        aliases: {
          Southwest: "the isolated Arabic ض (dad)",
        },
        glyph: "ص (isolated Arabic sad)",
        key: (name) => `sadIsolated${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a unit loop with a unit tooth west of it on a three-unit baseline whose west end drops into a two-unit bowl with a unit tip rising at its west end",
        template: this.isolatedTemplate,
      },
      {
        aliases: {
          Southwest: "the medial Arabic ض (dad)",
        },
        glyph: "ص (medial Arabic sad)",
        key: (name) => `sadMedial${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a unit loop east of a unit tooth on a four-unit baseline that joins east and west",
        template: this.medialTemplate,
      },
    ]);
  }

  // 🔐 Private Fields

  /**
   * The upright ص (final Arabic sad) glyph's points as hexadecimal Code digits,
   * one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   *    ╷┌┐
   * ╷ ┌┴┴┴╴
   * └─┘
   * ```
   */
  private readonly finalTemplate: readonly string[] = [
    "...465.",
    "4.6bbb1",
    "a39....",
  ];

  /**
   * The upright ص (initial Arabic sad) glyph's points as hexadecimal Code
   * digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   *  ╷┌┐
   * ╶┴┴┘
   * ```
   */
  private readonly initialTemplate: readonly string[] = [".465", "2bb9"];

  /**
   * The upright ص (isolated Arabic sad) glyph's points as hexadecimal Code
   * digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   *    ╷┌┐
   * ╷ ┌┴┴┘
   * └─┘
   * ```
   */
  private readonly isolatedTemplate: readonly string[] = [
    "...465",
    "4.6bb9",
    "a39...",
  ];

  /**
   * The upright ص (medial Arabic sad) glyph's points as hexadecimal Code
   * digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   *  ╷┌┐
   * ╶┴┴┴╴
   * ```
   */
  private readonly medialTemplate: readonly string[] = [".465.", "2bbb1"];

  // 🔑 Public Fields

  /** One evaluator per form and orientation, `sadFinalSoutheastArabicCount` through `sadMedialNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
