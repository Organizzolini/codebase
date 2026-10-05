import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of each positional form of the ط
 * (Arabic tah) skeleton — final, initial, isolated, and medial — one per corner
 * and clockwise rotation, each counting that form's base template, which faces
 * Southwest, drawn that way. A letter sharing a form's skeleton, differing from
 * it only by dots or by other marks, is an alias of that form.
 */
@Injectable()
export class TahArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.formEvaluators([
      {
        aliases: {
          Southwest: "the final Arabic ظ (zah)",
        },
        glyph: "ط (final Arabic tah)",
        key: (name) => `tahFinal${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a unit stem rising from the west side of a unit loop whose east corner joins east",
        template: this.finalTemplate,
      },
      {
        aliases: {
          Southwest: "the initial Arabic ظ (zah)",
        },
        glyph: "ط (initial Arabic tah)",
        key: (name) => `tahInitial${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a unit stem rising from the west side of a unit loop whose west corner joins west",
        template: this.initialTemplate,
      },
      {
        aliases: {
          Southwest: "the isolated Arabic ظ (zah)",
        },
        glyph: "ط (isolated Arabic tah)",
        key: (name) => `tahIsolated${name}ArabicCount`,
        script: "Arabic",
        shape: "a unit loop with a unit stem rising from its northwest corner",
        template: this.isolatedTemplate,
      },
      {
        aliases: {
          Southwest: "the medial Arabic ظ (zah)",
        },
        glyph: "ط (medial Arabic tah)",
        key: (name) => `tahMedial${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a unit stem rising from the west side of a unit loop on a three-unit baseline that joins east and west",
        template: this.medialTemplate,
      },
    ]);
  }

  // 🔐 Private Fields

  /**
   * The upright ط (final Arabic tah) glyph's points as hexadecimal Code digits,
   * one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   * ╷
   * ├┐
   * └┴╴
   * ```
   */
  private readonly finalTemplate: readonly string[] = ["4..", "e5.", "ab1"];

  /**
   * The upright ط (initial Arabic tah) glyph's points as hexadecimal Code
   * digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   *  ╷
   *  ├┐
   * ╶┴┘
   * ```
   */
  private readonly initialTemplate: readonly string[] = [".4.", ".e5", "2b9"];

  /**
   * The upright ط (isolated Arabic tah) glyph's points as hexadecimal Code
   * digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   * ╷
   * ├┐
   * └┘
   * ```
   */
  private readonly isolatedTemplate: readonly string[] = ["4.", "e5", "a9"];

  /**
   * The upright ط (medial Arabic tah) glyph's points as hexadecimal Code
   * digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   *  ╷
   *  ├┐
   * ╶┴┴╴
   * ```
   */
  private readonly medialTemplate: readonly string[] = [".4..", ".e5.", "2bb1"];

  // 🔑 Public Fields

  /** One evaluator per form and orientation, `tahFinalSoutheastArabicCount` through `tahMedialNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
