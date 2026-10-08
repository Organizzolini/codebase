import { Inject, Injectable } from "@nestjs/common";

import { BettiNumber1CountCharacteristicService } from "../../path/topology/betti-number-1-count-characteristic.service";
import { LongestHorizontalRunLengthCharacteristicService } from "../../submatrix/run/longest-horizontal-run-length-characteristic.service";
import { LongestVerticalRunLengthCharacteristicService } from "../../submatrix/run/longest-vertical-run-length-characteristic.service";
import { CompoundUtilitiesService } from "../compound-utilities.service";

import { StrandUtilitiesService } from "./strand-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Whether a Code's repeating unit is a double chain — two junction-free open
 * strands at pitch `2 rows - 2` that wrap across the tile edge and reverse
 * at their tightest turn, with a horizontal run one short of the unit's
 * width and a vertical run two short of its depth. The pitch is the unit's
 * own column count.
 */
@Injectable()
export class IsDoubleChainCharacteristicService implements CharacteristicEvaluator<boolean> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(BettiNumber1CountCharacteristicService)
    private readonly bettiNumber1CountService: BettiNumber1CountCharacteristicService,
    @Inject(CompoundUtilitiesService)
    private readonly compoundUtilitiesService: CompoundUtilitiesService,
    @Inject(LongestHorizontalRunLengthCharacteristicService)
    private readonly longestHorizontalRunLengthService: LongestHorizontalRunLengthCharacteristicService,
    @Inject(LongestVerticalRunLengthCharacteristicService)
    private readonly longestVerticalRunLengthService: LongestVerticalRunLengthCharacteristicService,
    @Inject(StrandUtilitiesService)
    private readonly strandUtilitiesService: StrandUtilitiesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `isDoubleChain` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "compound",
    description:
      "Whether the repeating unit is two junction-free, acyclic, fully inked, dot-free open strands at pitch 2 rows - 2 that cross the tile edge, reverse at their tightest turn, end off the border rules, and run the width - 1 horizontally and rows - 2 vertically.",
    formula: String.raw`n_{\text{fork}} = n_{\text{cross}} = 0 \wedge \beta_0 = 2 \wedge \beta_1 = 0 \wedge \left|V_1\right| = 4 \wedge p = 2r - 2 \wedge n_{\text{tile}} > 0 \wedge \text{reversesAtItsTightestTurn} \wedge \neg\,\text{endsOnBorderRules} \wedge \ell_h = p - 1 \wedge \ell_v = r - 2 \wedge \rho = 1 \wedge n_{\text{dot}} = 0`,
    key: "isDoubleChain",
    name: "Is Double Chain",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Checks the unit is two wrapping, reversing open strands at pitch `2 rows - 2` with runs of `width - 1` and `rows - 2`. */
  public compute(context: CharacteristicContext): boolean {
    const { columns, rows } = context;

    return (
      this.compoundUtilitiesService.isJunctionFree(context) &&
      this.strandUtilitiesService.hasStrandEnds(context, 2) &&
      this.bettiNumber1CountService.compute(context) === 0 &&
      columns === 2 * rows - 2 &&
      this.strandUtilitiesService.isWrappingReversal(context) &&
      this.longestHorizontalRunLengthService.compute(context) === columns - 1 &&
      this.longestVerticalRunLengthService.compute(context) === rows - 2
    );
  }
}
