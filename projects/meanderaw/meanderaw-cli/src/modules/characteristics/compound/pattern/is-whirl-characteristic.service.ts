import { Inject, Injectable } from "@nestjs/common";

import { BettiNumber0CountCharacteristicService } from "../../path/topology/betti-number-0-count-characteristic.service";
import { BettiNumber1CountCharacteristicService } from "../../path/topology/betti-number-1-count-characteristic.service";
import { FreeEndCountCharacteristicService } from "../../path/topology/free-end-count-characteristic.service";
import { InflectionCountCharacteristicService } from "../../path/turn/inflection-count-characteristic.service";
import { MaxMonotonicTurnLengthCharacteristicService as MaximumMonotonicTurnLengthCharacteristicService } from "../../path/turn/max-monotonic-turn-length-characteristic.service";
import { TotalTurnCountCharacteristicService } from "../../path/turn/total-turn-count-characteristic.service";
import { DotCountCharacteristicService } from "../../submatrix/point/dot-count-characteristic.service";
import { LongestHorizontalRunLengthCharacteristicService } from "../../submatrix/run/longest-horizontal-run-length-characteristic.service";
import { CompoundUtilitiesService } from "../compound-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Whether a Code's repeating unit is a whirl — fully inked, junction-free,
 * acyclic open strands that each wind in one way for `rows` turns, reverse
 * exactly once, and wind back out for `rows` more, with no horizontal run
 * longer than `rows - 1`.
 */
@Injectable()
export class IsWhirlCharacteristicService implements CharacteristicEvaluator<boolean> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(BettiNumber0CountCharacteristicService)
    private readonly bettiNumber0CountService: BettiNumber0CountCharacteristicService,
    @Inject(BettiNumber1CountCharacteristicService)
    private readonly bettiNumber1CountService: BettiNumber1CountCharacteristicService,
    @Inject(CompoundUtilitiesService)
    private readonly compoundUtilitiesService: CompoundUtilitiesService,
    @Inject(DotCountCharacteristicService)
    private readonly dotCountService: DotCountCharacteristicService,
    @Inject(FreeEndCountCharacteristicService)
    private readonly freeEndCountService: FreeEndCountCharacteristicService,
    @Inject(InflectionCountCharacteristicService)
    private readonly inflectionCountService: InflectionCountCharacteristicService,
    @Inject(LongestHorizontalRunLengthCharacteristicService)
    private readonly longestHorizontalRunLengthService: LongestHorizontalRunLengthCharacteristicService,
    @Inject(MaximumMonotonicTurnLengthCharacteristicService)
    private readonly maximumMonotonicTurnLengthService: MaximumMonotonicTurnLengthCharacteristicService,
    @Inject(TotalTurnCountCharacteristicService)
    private readonly totalTurnCountService: TotalTurnCountCharacteristicService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `isWhirl` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "compound",
    description:
      "Whether the unit is dot-free, junction-free, acyclic open strands, at least three rows deep, whose longest run of same-handed turns equals rows, that turn 2 rows times and change hand once per strand, with a longest horizontal run of rows - 1.",
    formula: String.raw`n_{\text{fork}} = n_{\text{cross}} = n_{\text{dot}} = 0 \wedge \beta_1 = 0 \wedge \left|V_1\right| = 2\beta_0 \wedge \mu = r \geq 3 \wedge \tau = 2r\beta_0 \wedge n_{\text{inflection}} = \beta_0 \wedge \ell_h = r - 1`,
    key: "isWhirl",
    name: "Is Whirl",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  /** Whether the ink is dot-free, junction-free, acyclic strands with two free ends each. */
  private isOpenStrandSet(context: CharacteristicContext): boolean {
    return (
      this.compoundUtilitiesService.isJunctionFree(context) &&
      this.dotCountService.compute(context) === 0 &&
      this.bettiNumber1CountService.compute(context) === 0 &&
      this.freeEndCountService.compute(context) ===
        2 * this.bettiNumber0CountService.compute(context)
    );
  }

  // 🌎 Public Methods

  /** Checks every strand winds in and back out once per row, reversing once. */
  public compute(context: CharacteristicContext): boolean {
    const { rows } = context;
    const strands = this.bettiNumber0CountService.compute(context);

    return (
      rows >= 3 &&
      this.isOpenStrandSet(context) &&
      this.maximumMonotonicTurnLengthService.compute(context) === rows &&
      this.totalTurnCountService.compute(context) === 2 * rows * strands &&
      this.inflectionCountService.compute(context) === strands &&
      this.longestHorizontalRunLengthService.compute(context) === rows - 1
    );
  }
}
