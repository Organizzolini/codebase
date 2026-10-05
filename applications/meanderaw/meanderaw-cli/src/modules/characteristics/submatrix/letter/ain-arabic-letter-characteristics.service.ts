import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of each positional form of the ع
 * (Arabic ain) skeleton — final, initial, isolated, and medial — one per corner
 * and clockwise rotation, each counting that form's base template, which faces
 * Southwest, drawn that way. A letter sharing a form's skeleton, differing from
 * it only by dots or by other marks, is an alias of that form.
 */
@Injectable()
export class AinArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.formEvaluators([
      {
        aliases: {
          Southwest: "the final Arabic غ (ghain)",
        },
        glyph: "ع (final Arabic ain)",
        key: (name) => `ainFinal${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a unit loop whose east corner joins east, dropping west into a unit stroke and a two-unit base stroke running east",
        template: this.finalTemplate,
      },
      {
        aliases: {
          Southwest: "the initial Arabic غ (ghain)",
        },
        glyph: "ع (initial Arabic ain)",
        key: (name) => `ainInitial${name}ArabicCount`,
        script: "Arabic",
        shape: "a unit head open to the east whose west corner joins west",
        template: this.initialTemplate,
      },
      {
        aliases: {
          Southwest: "the isolated Arabic غ (ghain)",
        },
        glyph: "ع (isolated Arabic ain)",
        key: (name) => `ainIsolated${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a unit hook open to the east sitting on the middle of a two-unit bar, whose west end drops a unit stroke into a two-unit base stroke, two bowls open to the east stacked",
        template: this.isolatedTemplate,
      },
      {
        aliases: {
          Southwest: "the medial Arabic غ (ghain)",
        },
        glyph: "ع (medial Arabic ain)",
        key: (name) => `ainMedial${name}ArabicCount`,
        script: "Arabic",
        shape:
          "a unit loop on a three-unit baseline that joins east and west, its top running a unit east as the head's ear",
        template: this.medialTemplate,
      },
    ]);
  }

  // 🔐 Private Fields

  /**
   * The upright ع (final Arabic ain) glyph's points as hexadecimal Code digits,
   * one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   *  ┌┐
   * ┌┴┴╴
   * └─╴
   * ```
   */
  private readonly finalTemplate: readonly string[] = [".65.", "6bb1", "a31."];

  /**
   * The upright ع (initial Arabic ain) glyph's points as hexadecimal Code
   * digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   *  ┌╴
   * ╶┴╴
   * ```
   */
  private readonly initialTemplate: readonly string[] = [".61", "2b1"];

  /**
   * The upright ع (isolated Arabic ain) glyph's points as hexadecimal Code
   * digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   *  ┌╴
   * ┌┴╴
   * └─╴
   * ```
   */
  private readonly isolatedTemplate: readonly string[] = [".61", "6b1", "a31"];

  /**
   * The upright ع (medial Arabic ain) glyph's points as hexadecimal Code
   * digits, one string per row, `.` outside the glyph, facing Southwest:
   *
   * ```text
   *  ┌┬╴
   * ╶┴┴╴
   * ```
   */
  private readonly medialTemplate: readonly string[] = [".671", "2bb1"];

  // 🔑 Public Fields

  /** One evaluator per form and orientation, `ainFinalSoutheastArabicCount` through `ainMedialNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
