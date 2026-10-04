import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ユ (katakana yu) glyph — a
 * unit stroke turning down into a base stroke that runs a unit past the turn —
 * one per corner and clockwise rotation, each counting the base template drawn
 * that way. The base faces Southeast, drawn:
 *
 * ```text
 * ╶┐
 * ╶┴╴
 * ```
 */
@Injectable()
export class YuKatakanaLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southeast: "the Hebrew ב (bet)",
      },
      glyph: "ユ (katakana yu)",
      key: (name) => `yu${name}KatakanaCount`,
      script: "Katakana",
      shape:
        "a unit stroke turning down into a base stroke that runs a unit past the turn",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["25.", "2b1"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `yuSoutheastKatakanaCount` through `yuNorthwestThreeQuarterKatakanaCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
