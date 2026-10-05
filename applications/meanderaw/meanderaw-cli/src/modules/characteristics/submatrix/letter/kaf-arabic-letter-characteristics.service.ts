import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of each positional form of the ك
 * (Arabic kaf) skeleton — final, initial, isolated, and medial — one per corner
 * and clockwise rotation, each counting that form's base template, which faces
 * Southwest, drawn that way. A letter sharing a form's skeleton, differing from
 * it only by dots or by other marks, is an alias of that form.
 */
@Injectable()
export class KafArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.formEvaluators([
      {
        glyph: "ك (final Arabic kaf)",
        key: (name) => `kafFinal${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a two-unit stem at the west end of a three-unit baseline that joins east, with a unit tip rising one unit short of its east end",
        template: this.finalTemplate,
      },
      {
        glyph: "ك (initial Arabic kaf)",
        key: (name) => `kafInitial${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a three-unit top stroke running west from a unit stem whose foot joins west",
        template: this.initialTemplate,
      },
      {
        glyph: "ك (isolated Arabic kaf)",
        key: (name) => `kafIsolated${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a two-unit baseline with a two-unit stem rising from its west end and a unit tip rising from its east end",
        template: this.isolatedTemplate,
      },
      {
        glyph: "ك (medial Arabic kaf)",
        key: (name) => `kafMedial${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a three-unit top stroke running west from a unit stem standing on a two-unit baseline that joins east and west",
        template: this.medialTemplate,
      },
    ]);
  }

  // 🔐 Private Fields

  /**
   * The upright ك (final Arabic kaf) glyph's points as hexadecimal Code digits,
   * one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   * ╷
   * │ ╷
   * └─┴╴
   * ```
   */
  private readonly finalTemplate: readonly string[] = ["4...", "c.4.", "a3b1"];

  /**
   * The upright ك (initial Arabic kaf) glyph's points as hexadecimal Code
   * digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   * ╶──┐
   *   ╶┘
   * ```
   */
  private readonly initialTemplate: readonly string[] = ["2335", "..29"];

  /**
   * The upright ك (isolated Arabic kaf) glyph's points as hexadecimal Code
   * digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   * ╷
   * │ ╷
   * └─┘
   * ```
   */
  private readonly isolatedTemplate: readonly string[] = ["4..", "c.4", "a39"];

  /**
   * The upright ك (medial Arabic kaf) glyph's points as hexadecimal Code
   * digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   * ╶──┐
   *   ╶┴╴
   * ```
   */
  private readonly medialTemplate: readonly string[] = ["2335.", "..2b1"];

  // 🔑 Public Fields

  /** One evaluator per form and orientation, `kafFinalSoutheastArabicCount` through `kafMedialNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
