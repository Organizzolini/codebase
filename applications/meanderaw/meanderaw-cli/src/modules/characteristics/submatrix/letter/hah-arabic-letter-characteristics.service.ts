import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of each positional form of the ح
 * (Arabic hah) skeleton — final, initial, isolated, and medial — one per corner
 * and clockwise rotation, each counting that form's base template, which faces
 * Southwest, drawn that way. A letter sharing a form's skeleton, differing from
 * it only by dots or by other marks, is an alias of that form.
 */
@Injectable()
export class HahArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.formEvaluators([
      {
        aliases: {
          Southwest: "the final Arabic ج (jeem) and خ (khah)",
        },
        glyph: "ح (final Arabic hah)",
        key: (name) => `hahFinal${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a two-unit joining stroke running east from a one-step staircase that drops west into a two-unit base stroke running east, its curve drawn as an orthogonal zig-zag",
        template: this.finalTemplate,
      },
      {
        aliases: {
          Southwest: "the initial Arabic ج (jeem) and خ (khah)",
        },
        glyph: "ح (initial Arabic hah)",
        key: (name) => `hahInitial${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a unit head stroke running east from a one-step staircase that drops west onto a unit joining stroke, its curve drawn as an orthogonal zig-zag",
        template: this.initialTemplate,
      },
      {
        aliases: {
          Southwest: "the isolated Arabic ج (jeem) and خ (khah)",
        },
        glyph: "ح (isolated Arabic hah)",
        key: (name) => `hahIsolated${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a unit head stroke running east from a one-step staircase that drops west into a two-unit base stroke running east, its curve drawn as an orthogonal zig-zag",
        template: this.isolatedTemplate,
      },
      {
        aliases: {
          Southwest: "the medial Arabic ج (jeem) and خ (khah)",
        },
        glyph: "ح (medial Arabic hah)",
        key: (name) => `hahMedial${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a unit head stroke running east from a one-step staircase that drops west onto a two-unit baseline joining east and west, its curve drawn as an orthogonal zig-zag",
        template: this.medialTemplate,
      },
    ]);
  }

  // 🔐 Private Fields

  /**
   * The upright ح (final Arabic hah) glyph's points as hexadecimal Code digits,
   * one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   *  ┌─╴
   * ┌┘
   * └─╴
   * ```
   */
  private readonly finalTemplate: readonly string[] = [".631", "69..", "a31."];

  /**
   * The upright ح (initial Arabic hah) glyph's points as hexadecimal Code
   * digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   *   ┌╴
   *  ┌┘
   * ╶┘
   * ```
   */
  private readonly initialTemplate: readonly string[] = [
    "..61",
    ".69.",
    "29..",
  ];

  /**
   * The upright ح (isolated Arabic hah) glyph's points as hexadecimal Code
   * digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   *  ┌╴
   * ┌┘
   * └─╴
   * ```
   */
  private readonly isolatedTemplate: readonly string[] = [".61", "69.", "a31"];

  /**
   * The upright ح (medial Arabic hah) glyph's points as hexadecimal Code
   * digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   *   ┌╴
   *  ┌┘
   * ╶┴╴
   * ```
   */
  private readonly medialTemplate: readonly string[] = ["..61", ".69.", "2b1."];

  // 🔑 Public Fields

  /** One evaluator per form and orientation, `hahFinalSoutheastArabicCount` through `hahMedialNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
