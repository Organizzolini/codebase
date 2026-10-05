import { Inject, Injectable } from "@nestjs/common";

import { EndsAreLatticeNeighborsCharacteristicService } from "../../path/end/ends-are-lattice-neighbors-characteristic.service";
import { EndsOnBorderRulesCharacteristicService } from "../../path/end/ends-on-border-rules-characteristic.service";
import { TileCrossingCountCharacteristicService } from "../../path/tile-crossing/tile-crossing-count-characteristic.service";
import { BettiNumber0CountCharacteristicService } from "../../path/topology/betti-number-0-count-characteristic.service";
import { BettiNumber1CountCharacteristicService } from "../../path/topology/betti-number-1-count-characteristic.service";
import { FreeEndCountCharacteristicService } from "../../path/topology/free-end-count-characteristic.service";
import { EmbeddedUCountCharacteristicService } from "../../submatrix/embedded/embedded-u-count-characteristic.service";
import { DotCountCharacteristicService } from "../../submatrix/point/dot-count-characteristic.service";
import { LongestVerticalRunLengthCharacteristicService } from "../../submatrix/run/longest-vertical-run-length-characteristic.service";
import { CompoundUtilitiesService } from "../compound-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Whether a Code's repeating unit is a waterfall — junction-free, acyclic,
 * dot-free open strands that zig-zag down across the tile edge one row at a
 * time, ending on the border rules with the two ends apart and no embedded
 * U anywhere.
 */
@Injectable()
export class IsWaterfallsCharacteristicService implements CharacteristicEvaluator<boolean> {
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
    @Inject(EmbeddedUCountCharacteristicService)
    private readonly embeddedUCountService: EmbeddedUCountCharacteristicService,
    @Inject(EndsAreLatticeNeighborsCharacteristicService)
    private readonly endsAreLatticeNeighborsService: EndsAreLatticeNeighborsCharacteristicService,
    @Inject(EndsOnBorderRulesCharacteristicService)
    private readonly endsOnBorderRulesService: EndsOnBorderRulesCharacteristicService,
    @Inject(FreeEndCountCharacteristicService)
    private readonly freeEndCountService: FreeEndCountCharacteristicService,
    @Inject(LongestVerticalRunLengthCharacteristicService)
    private readonly longestVerticalRunLengthService: LongestVerticalRunLengthCharacteristicService,
    @Inject(TileCrossingCountCharacteristicService)
    private readonly tileCrossingCountService: TileCrossingCountCharacteristicService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `isWaterfalls` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "compound",
    description:
      "Whether the repeating unit is junction-free, acyclic, dot-free open strands with two free ends each that cross the tile edge, end on the border rules with ends that are not lattice neighbors, hold no embedded U, and run exactly one point vertically.",
    formula: String.raw`n_{\text{fork}} = n_{\text{cross}} = 0 \wedge n_{\text{dot}} = 0 \wedge \beta_1 = 0 \wedge \left|V_1\right| = 2\beta_0 \wedge n_{\text{tile}} > 0 \wedge \text{endsOnBorderRules} \wedge \neg\,\text{endsAreLatticeNeighbors} \wedge n_{\text{U}} = 0 \wedge \ell_v = 1`,
    key: "isWaterfalls",
    name: "Is Waterfalls",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  /** Whether the ink is junction-free, dot-free, and acyclic, with two free ends per component. */
  private isDotFreeOpenStrandSet(context: CharacteristicContext): boolean {
    return (
      this.compoundUtilitiesService.isJunctionFree(context) &&
      this.dotCountService.compute(context) === 0 &&
      this.bettiNumber1CountService.compute(context) === 0 &&
      this.freeEndCountService.compute(context) ===
        2 * this.bettiNumber0CountService.compute(context)
    );
  }

  // 🌎 Public Methods

  /** Checks the unit is dot-free open strands stepping down across the tile edge to the border rules, ends apart, with no embedded U. */
  public compute(context: CharacteristicContext): boolean {
    return (
      this.isDotFreeOpenStrandSet(context) &&
      this.tileCrossingCountService.compute(context) > 0 &&
      this.endsOnBorderRulesService.compute(context) &&
      !this.endsAreLatticeNeighborsService.compute(context) &&
      this.embeddedUCountService.compute(context) === 0 &&
      this.longestVerticalRunLengthService.compute(context) === 1
    );
  }
}
