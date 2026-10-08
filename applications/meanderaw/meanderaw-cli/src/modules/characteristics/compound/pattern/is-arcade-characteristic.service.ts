import { Inject, Injectable } from "@nestjs/common";

import { BettiNumber1CountCharacteristicService } from "../../path/topology/betti-number-1-count-characteristic.service";
import { FreeEndCountCharacteristicService } from "../../path/topology/free-end-count-characteristic.service";
import { CrossCountCharacteristicService } from "../../submatrix/cross/cross-count-characteristic.service";
import { ForkCountCharacteristicService } from "../../submatrix/fork/fork-count-characteristic.service";
import { DotCountCharacteristicService } from "../../submatrix/point/dot-count-characteristic.service";
import { LongestVerticalRunLengthCharacteristicService } from "../../submatrix/run/longest-vertical-run-length-characteristic.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Whether a Code's repeating unit is an arcade — rails whose teeth hang
 * the band's full depth and interleave: every free end is the tip of a
 * tooth, so free ends and forks pair off, and the rails close a loop around
 * the band.
 */
@Injectable()
export class IsArcadeCharacteristicService implements CharacteristicEvaluator<boolean> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(BettiNumber1CountCharacteristicService)
    private readonly bettiNumber1CountService: BettiNumber1CountCharacteristicService,
    @Inject(CrossCountCharacteristicService)
    private readonly crossCountService: CrossCountCharacteristicService,
    @Inject(DotCountCharacteristicService)
    private readonly dotCountService: DotCountCharacteristicService,
    @Inject(ForkCountCharacteristicService)
    private readonly forkCountService: ForkCountCharacteristicService,
    @Inject(FreeEndCountCharacteristicService)
    private readonly freeEndCountService: FreeEndCountCharacteristicService,
    @Inject(LongestVerticalRunLengthCharacteristicService)
    private readonly longestVerticalRunLengthService: LongestVerticalRunLengthCharacteristicService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `isArcade` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "compound",
    description:
      "Whether the unit has no cross or bare dot, at least two forks, exactly as many free ends as forks, at least one loop, and a vertical run rows - 1 edges long.",
    formula: String.raw`n_{\text{cross}} = 0 \wedge n_{\text{dot}} = 0 \wedge n_{\text{fork}} \geq 2 \wedge \left|V_1\right| = n_{\text{fork}} \wedge \beta_1 \geq 1 \wedge \ell_v = r - 1`,
    key: "isArcade",
    name: "Is Arcade",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Checks the unit is looped rails with one full-depth tooth per fork. */
  public compute(context: CharacteristicContext): boolean {
    const forks = this.forkCountService.compute(context);

    return (
      this.crossCountService.compute(context) === 0 &&
      this.dotCountService.compute(context) === 0 &&
      forks >= 2 &&
      this.freeEndCountService.compute(context) === forks &&
      this.bettiNumber1CountService.compute(context) >= 1 &&
      this.longestVerticalRunLengthService.compute(context) === context.rows - 1
    );
  }
}
