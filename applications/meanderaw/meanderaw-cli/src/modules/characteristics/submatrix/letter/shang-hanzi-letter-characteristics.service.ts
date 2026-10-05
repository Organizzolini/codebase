import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the 上 (hanzi shang) glyph — a
 * two-unit base with a two-unit stem rising from its middle and a unit stroke
 * reaching east from the stem's middle — one per corner and clockwise
 * rotation, each counting the base template drawn that way. The base faces
 * Southeast, drawn:
 *
 * ```text
 *  ╷
 *  ├╴
 * ╶┴╴
 * ```
 */
@Injectable()
export class ShangHanziLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      glyph: "上 (hanzi shang)",
      key: (name) => `shang${name}HanziCount`,
      script: "Hanzi",
      shape:
        "a two-unit base with a two-unit stem rising from its middle and a unit stroke reaching east from the stem's middle",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [".4.", ".e1", "2b1"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `shangSoutheastHanziCount` through `shangNorthwestThreeQuarterHanziCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
