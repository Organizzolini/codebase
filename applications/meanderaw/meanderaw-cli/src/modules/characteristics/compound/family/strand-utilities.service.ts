import { Inject, Injectable } from "@nestjs/common";

import { EndsOnBorderRulesCharacteristicService } from "../../path/end/ends-on-border-rules-characteristic.service";
import { TileCrossingCountCharacteristicService } from "../../path/tile-crossing/tile-crossing-count-characteristic.service";
import { BettiNumber0CountCharacteristicService } from "../../path/topology/betti-number-0-count-characteristic.service";
import { BettiNumber1CountCharacteristicService } from "../../path/topology/betti-number-1-count-characteristic.service";
import { FreeEndCountCharacteristicService } from "../../path/topology/free-end-count-characteristic.service";
import { ReversesAtItsTightestTurnCharacteristicService } from "../../path/turn/reverses-at-its-tightest-turn-characteristic.service";
import { DensityCharacteristicService } from "../../submatrix/point/density-characteristic.service";
import { DotCountCharacteristicService } from "../../submatrix/point/dot-count-characteristic.service";
import { LongestHorizontalRunLengthCharacteristicService } from "../../submatrix/run/longest-horizontal-run-length-characteristic.service";
import { LongestVerticalRunLengthCharacteristicService } from "../../submatrix/run/longest-vertical-run-length-characteristic.service";
import { CompoundUtilitiesService } from "../compound-utilities.service";

import type { CharacteristicContext } from "../../characteristics.types";

/**
 * Shared strand readings the chain, double-chain, whirl, swirl, and clasps
 * predicates inject: how many open strands the ink is, whether every point
 * is inked with no bare dot, whether a reversing strand wraps across the
 * tile edge, and whether a coil stays inside the tile.
 */
@Injectable()
export class StrandUtilitiesService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(BettiNumber0CountCharacteristicService)
    private readonly bettiNumber0CountService: BettiNumber0CountCharacteristicService,
    @Inject(BettiNumber1CountCharacteristicService)
    private readonly bettiNumber1CountService: BettiNumber1CountCharacteristicService,
    @Inject(CompoundUtilitiesService)
    private readonly compoundUtilitiesService: CompoundUtilitiesService,
    @Inject(DensityCharacteristicService)
    private readonly densityService: DensityCharacteristicService,
    @Inject(DotCountCharacteristicService)
    private readonly dotCountService: DotCountCharacteristicService,
    @Inject(EndsOnBorderRulesCharacteristicService)
    private readonly endsOnBorderRulesService: EndsOnBorderRulesCharacteristicService,
    @Inject(FreeEndCountCharacteristicService)
    private readonly freeEndCountService: FreeEndCountCharacteristicService,
    @Inject(LongestHorizontalRunLengthCharacteristicService)
    private readonly longestHorizontalRunLengthService: LongestHorizontalRunLengthCharacteristicService,
    @Inject(LongestVerticalRunLengthCharacteristicService)
    private readonly longestVerticalRunLengthService: LongestVerticalRunLengthCharacteristicService,
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

  /** Whether the ink is junction-free, acyclic, fully inked, dot-free, never crosses the tile edge, and runs `rows - 1` both ways. */
  public isTileBoundCoil(context: CharacteristicContext): boolean {
    const span = context.rows - 1;

    return (
      this.compoundUtilitiesService.isJunctionFree(context) &&
      this.bettiNumber1CountService.compute(context) === 0 &&
      this.tileCrossingCountService.compute(context) === 0 &&
      this.isFullInkWithoutDots(context) &&
      this.longestHorizontalRunLengthService.compute(context) === span &&
      this.longestVerticalRunLengthService.compute(context) === span
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
