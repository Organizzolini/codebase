import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the Z glyph — three bars
 * joined into a serpentine, mirroring S, bars horizontal — one per corner and
 * clockwise rotation, each counting the base template drawn that way. The base
 * faces Southeast, drawn:
 *
 * ```text
 * ╶┐
 * ┌┘
 * └╴
 * ```
 */
@Injectable()
export class ZLatinLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southeast: "the Greek Ζ (zeta) and the hangul ㄹ (rieul)",
      },
      glyph: "Z",
      key: (name) => `z${name}LatinCount`,
      script: "Latin",
      shape:
        "three bars joined into a serpentine, mirroring S, bars horizontal",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["25", "69", "a1"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `zSoutheastLatinCount` through `zNorthwestThreeQuarterLatinCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
