import { Inject, Injectable } from "@nestjs/common";

import { LongestHorizontalRunLengthCharacteristicService } from "../../submatrix/run/longest-horizontal-run-length-characteristic.service";
import { LongestVerticalRunLengthCharacteristicService } from "../../submatrix/run/longest-vertical-run-length-characteristic.service";
import { IsSingleArcCharacteristicService } from "../structure/is-single-arc-characteristic.service";

import { StrandUtilitiesService } from "./strand-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Whether a Code's repeating unit is a single-strand chain — one open arc,
 * as wide as it is deep, that wraps across the tile edge and reverses at
 * its tightest turn, with a horizontal run the full width of the unit and
 * a vertical run one short of its depth. The pitch is the unit's own
 * column count.
 */
@Injectable()
export class IsChainCharacteristicService implements CharacteristicEvaluator<boolean> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(IsSingleArcCharacteristicService)
    private readonly isSingleArcService: IsSingleArcCharacteristicService,
    @Inject(LongestHorizontalRunLengthCharacteristicService)
    private readonly longestHorizontalRunLengthService: LongestHorizontalRunLengthCharacteristicService,
    @Inject(LongestVerticalRunLengthCharacteristicService)
    private readonly longestVerticalRunLengthService: LongestVerticalRunLengthCharacteristicService,
    @Inject(StrandUtilitiesService)
    private readonly strandUtilitiesService: StrandUtilitiesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `isChain` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "compound",
    description:
      "Whether the repeating unit is one fully inked, dot-free open arc at pitch rows that crosses the tile edge, reverses at its tightest turn, ends off the border rules, and runs the full width horizontally and rows - 1 vertically.",
    formula: String.raw`\text{isSingleArc} \wedge p = r \wedge n_{\text{tile}} > 0 \wedge \text{reversesAtItsTightestTurn} \wedge \neg\,\text{endsOnBorderRules} \wedge \ell_h = p \wedge \ell_v = r - 1 \wedge \rho = 1 \wedge n_{\text{dot}} = 0`,
    key: "isChain",
    name: "Is Chain",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Checks the unit is a wrapping, reversing open arc at pitch `rows` with runs of the full width and `rows - 1`. */
  public compute(context: CharacteristicContext): boolean {
    const { columns, rows } = context;

    return (
      this.isSingleArcService.compute(context) &&
      columns === rows &&
      this.strandUtilitiesService.isWrappingReversal(context) &&
      this.longestHorizontalRunLengthService.compute(context) === columns &&
      this.longestVerticalRunLengthService.compute(context) === rows - 1
    );
  }
}
