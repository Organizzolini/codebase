import { Inject, Injectable } from "@nestjs/common";

import { BettiNumber1CountCharacteristicService } from "../../path/topology/betti-number-1-count-characteristic.service";
import { FreeEndCountCharacteristicService } from "../../path/topology/free-end-count-characteristic.service";
import { MaxMonotonicTurnLengthCharacteristicService as MaximumMonotonicTurnLengthCharacteristicService } from "../../path/turn/max-monotonic-turn-length-characteristic.service";
import { TightestTurnCountCharacteristicService } from "../../path/turn/tightest-turn-count-characteristic.service";
import { CompoundUtilitiesService } from "../compound-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Whether a Code's repeating unit is a swirl — junction-free, acyclic
 * strands that wind one way for `2 rows - 2` turns, the deepest spiral a
 * band of that depth holds, with one hairpin per free end.
 */
@Injectable()
export class IsSwirlCharacteristicService implements CharacteristicEvaluator<boolean> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(BettiNumber1CountCharacteristicService)
    private readonly bettiNumber1CountService: BettiNumber1CountCharacteristicService,
    @Inject(CompoundUtilitiesService)
    private readonly compoundUtilitiesService: CompoundUtilitiesService,
    @Inject(FreeEndCountCharacteristicService)
    private readonly freeEndCountService: FreeEndCountCharacteristicService,
    @Inject(MaximumMonotonicTurnLengthCharacteristicService)
    private readonly maximumMonotonicTurnLengthService: MaximumMonotonicTurnLengthCharacteristicService,
    @Inject(TightestTurnCountCharacteristicService)
    private readonly tightestTurnCountService: TightestTurnCountCharacteristicService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `isSwirl` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "compound",
    description:
      "Whether the unit is junction-free and acyclic, its longest run of same-handed turns is 2 rows - 2 and at least four, and its hairpin count equals its free-end count.",
    formula: String.raw`n_{\text{fork}} = n_{\text{cross}} = 0 \wedge \beta_1 = 0 \wedge \mu = 2r - 2 \geq 4 \wedge n_{\text{hairpin}} = \left|V_1\right|`,
    key: "isSwirl",
    name: "Is Swirl",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Checks the unit winds one way for two turns per row, less two. */
  public compute(context: CharacteristicContext): boolean {
    const winding = this.maximumMonotonicTurnLengthService.compute(context);

    return (
      this.compoundUtilitiesService.isJunctionFree(context) &&
      this.bettiNumber1CountService.compute(context) === 0 &&
      winding >= 4 &&
      winding === 2 * context.rows - 2 &&
      this.tightestTurnCountService.compute(context) ===
        this.freeEndCountService.compute(context)
    );
  }
}
