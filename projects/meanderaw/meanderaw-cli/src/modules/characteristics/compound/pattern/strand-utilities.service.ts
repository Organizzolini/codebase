import { Inject, Injectable } from "@nestjs/common";

import { EndsOnBorderRulesCharacteristicService } from "../../path/end/ends-on-border-rules-characteristic.service";
import { TileCrossingCountCharacteristicService } from "../../path/tile-crossing/tile-crossing-count-characteristic.service";
import { BettiNumber0CountCharacteristicService } from "../../path/topology/betti-number-0-count-characteristic.service";
import { FreeEndCountCharacteristicService } from "../../path/topology/free-end-count-characteristic.service";
import { ReversesAtItsTightestTurnCharacteristicService } from "../../path/turn/reverses-at-its-tightest-turn-characteristic.service";
import { DensityCharacteristicService } from "../../submatrix/point/density-characteristic.service";
import { DotCountCharacteristicService } from "../../submatrix/point/dot-count-characteristic.service";

import type { CharacteristicContext } from "../../characteristics.types";

/**
 * Shared strand readings the double-chain predicate injects: how many open
 * strands the ink is, whether every point is inked with no bare dot, and
 * whether a reversing strand wraps across the tile edge.
 */
@Injectable()
export class StrandUtilitiesService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(BettiNumber0CountCharacteristicService)
    private readonly bettiNumber0CountService: BettiNumber0CountCharacteristicService,
    @Inject(DensityCharacteristicService)
    private readonly densityService: DensityCharacteristicService,
    @Inject(DotCountCharacteristicService)
    private readonly dotCountService: DotCountCharacteristicService,
    @Inject(EndsOnBorderRulesCharacteristicService)
    private readonly endsOnBorderRulesService: EndsOnBorderRulesCharacteristicService,
    @Inject(FreeEndCountCharacteristicService)
    private readonly freeEndCountService: FreeEndCountCharacteristicService,
    @Inject(ReversesAtItsTightestTurnCharacteristicService)
    private readonly reversesAtItsTightestTurnService: ReversesAtItsTightestTurnCharacteristicService,
    @Inject(TileCrossingCountCharacteristicService)
    private readonly tileCrossingCountService: TileCrossingCountCharacteristicService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Whether the unit has exactly `strands` components and two free ends per component. */
  public hasStrandEnds(
    context: CharacteristicContext,
    strands: number,
  ): boolean {
    return (
      this.bettiNumber0CountService.compute(context) === strands &&
      this.freeEndCountService.compute(context) === 2 * strands
    );
  }

  /** Whether every point of the unit is inked and none of them is a bare dot. */
  public isFullInkWithoutDots(context: CharacteristicContext): boolean {
    return (
      this.densityService.compute(context) === 1 &&
      this.dotCountService.compute(context) === 0
    );
  }

  /** Whether a fully inked, dot-free strand crosses the tile edge, reverses at its tightest turn, and ends off the border rules. */
  public isWrappingReversal(context: CharacteristicContext): boolean {
    return (
      this.tileCrossingCountService.compute(context) > 0 &&
      this.reversesAtItsTightestTurnService.compute(context) &&
      !this.endsOnBorderRulesService.compute(context) &&
      this.isFullInkWithoutDots(context)
    );
  }
}
