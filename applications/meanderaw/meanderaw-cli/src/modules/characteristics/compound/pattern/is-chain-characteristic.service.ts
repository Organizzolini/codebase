import { Inject, Injectable } from "@nestjs/common";

import { TileCrossingComponentDeltaCountCharacteristicService } from "../../path/tile-crossing/tile-crossing-component-delta-count-characteristic.service";
import { MaxMonotonicTurnLengthCharacteristicService as MaximumMonotonicTurnLengthCharacteristicService } from "../../path/turn/max-monotonic-turn-length-characteristic.service";
import { TightestTurnCountCharacteristicService } from "../../path/turn/tightest-turn-count-characteristic.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Whether a Code's repeating unit is a chain — links whose ink winds one
 * way at least four turns further than its hairpins, which the tile edge
 * joins into exactly one fewer component than the tile alone holds.
 */
@Injectable()
export class IsChainCharacteristicService implements CharacteristicEvaluator<boolean> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(MaximumMonotonicTurnLengthCharacteristicService)
    private readonly maximumMonotonicTurnLengthService: MaximumMonotonicTurnLengthCharacteristicService,
    @Inject(TightestTurnCountCharacteristicService)
    private readonly tightestTurnCountService: TightestTurnCountCharacteristicService,
    @Inject(TileCrossingComponentDeltaCountCharacteristicService)
    private readonly tileCrossingComponentDeltaCountService: TileCrossingComponentDeltaCountCharacteristicService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `isChain` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "compound",
    description:
      "Whether the longest run of same-handed turns exceeds the hairpin count by at least four and the tile boundary merges exactly one component.",
    formula: String.raw`\mu - n_{\text{hairpin}} \geq 4 \wedge \Delta b_0 = 1`,
    key: "isChain",
    name: "Is Chain",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Checks the unit winds past its hairpins and links across the tile edge. */
  public compute(context: CharacteristicContext): boolean {
    return (
      this.maximumMonotonicTurnLengthService.compute(context) -
        this.tightestTurnCountService.compute(context) >=
        4 && this.tileCrossingComponentDeltaCountService.compute(context) === 1
    );
  }
}
