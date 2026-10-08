import { Inject, Injectable } from "@nestjs/common";

import { EndsAreLatticeNeighborsCharacteristicService } from "../../path/end/ends-are-lattice-neighbors-characteristic.service";
import { MaxMonotonicTurnLengthCharacteristicService as MaximumMonotonicTurnLengthCharacteristicService } from "../../path/turn/max-monotonic-turn-length-characteristic.service";
import { ReversesAtItsTightestTurnCharacteristicService } from "../../path/turn/reverses-at-its-tightest-turn-characteristic.service";
import { LongestHorizontalRunLengthCharacteristicService } from "../../submatrix/run/longest-horizontal-run-length-characteristic.service";
import { CompoundUtilitiesService } from "../compound-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Whether a Code's repeating unit is clasps — junction-free hooks at least
 * three rows deep that reverse at their tightest turn, whose longest
 * horizontal run and longest one-handed winding are both `rows - 1`, and
 * whose ends sit apart.
 */
@Injectable()
export class IsClaspsCharacteristicService implements CharacteristicEvaluator<boolean> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(CompoundUtilitiesService)
    private readonly compoundUtilitiesService: CompoundUtilitiesService,
    @Inject(EndsAreLatticeNeighborsCharacteristicService)
    private readonly endsAreLatticeNeighborsService: EndsAreLatticeNeighborsCharacteristicService,
    @Inject(LongestHorizontalRunLengthCharacteristicService)
    private readonly longestHorizontalRunLengthService: LongestHorizontalRunLengthCharacteristicService,
    @Inject(MaximumMonotonicTurnLengthCharacteristicService)
    private readonly maximumMonotonicTurnLengthService: MaximumMonotonicTurnLengthCharacteristicService,
    @Inject(ReversesAtItsTightestTurnCharacteristicService)
    private readonly reversesAtItsTightestTurnService: ReversesAtItsTightestTurnCharacteristicService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `isClasps` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "compound",
    description:
      "Whether the unit is junction-free, at least three rows deep, reverses at its tightest turn, has free ends that are not lattice neighbors, and both its longest horizontal run and its longest run of same-handed turns equal rows - 1.",
    formula: String.raw`n_{\text{fork}} = n_{\text{cross}} = 0 \wedge r \geq 3 \wedge \text{reversesAtItsTightestTurn} \wedge \neg\,\text{endsAreLatticeNeighbors} \wedge \ell_h = \mu = r - 1`,
    key: "isClasps",
    name: "Is Clasps",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Checks the unit is hooks that wind once per row, less one, and reverse tightly. */
  public compute(context: CharacteristicContext): boolean {
    const { rows } = context;

    return (
      this.compoundUtilitiesService.isJunctionFree(context) &&
      rows >= 3 &&
      this.reversesAtItsTightestTurnService.compute(context) &&
      !this.endsAreLatticeNeighborsService.compute(context) &&
      this.longestHorizontalRunLengthService.compute(context) === rows - 1 &&
      this.maximumMonotonicTurnLengthService.compute(context) === rows - 1
    );
  }
}
