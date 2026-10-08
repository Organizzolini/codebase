import { Inject, Injectable } from "@nestjs/common";

import { BettiNumber0CountCharacteristicService } from "../../path/topology/betti-number-0-count-characteristic.service";
import { InflectionCountCharacteristicService } from "../../path/turn/inflection-count-characteristic.service";
import { MaxMonotonicTurnLengthCharacteristicService as MaximumMonotonicTurnLengthCharacteristicService } from "../../path/turn/max-monotonic-turn-length-characteristic.service";
import { TightestTurnCountCharacteristicService } from "../../path/turn/tightest-turn-count-characteristic.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Whether a Code's repeating unit is boxes — ink that winds one way at
 * least six turns further than it ever changes hand, with exactly one
 * hairpin per component.
 */
@Injectable()
export class IsBoxesCharacteristicService implements CharacteristicEvaluator<boolean> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(BettiNumber0CountCharacteristicService)
    private readonly bettiNumber0CountService: BettiNumber0CountCharacteristicService,
    @Inject(InflectionCountCharacteristicService)
    private readonly inflectionCountService: InflectionCountCharacteristicService,
    @Inject(MaximumMonotonicTurnLengthCharacteristicService)
    private readonly maximumMonotonicTurnLengthService: MaximumMonotonicTurnLengthCharacteristicService,
    @Inject(TightestTurnCountCharacteristicService)
    private readonly tightestTurnCountService: TightestTurnCountCharacteristicService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `isBoxes` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "compound",
    description:
      "Whether the longest run of same-handed turns exceeds the inflection count by at least six and the hairpin count equals the component count.",
    formula: String.raw`\mu - n_{\text{inflection}} \geq 6 \wedge n_{\text{hairpin}} = \beta_0`,
    key: "isBoxes",
    name: "Is Boxes",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Checks the unit winds far more than it inflects, one hairpin per component. */
  public compute(context: CharacteristicContext): boolean {
    return (
      this.maximumMonotonicTurnLengthService.compute(context) -
        this.inflectionCountService.compute(context) >=
        6 &&
      this.tightestTurnCountService.compute(context) ===
        this.bettiNumber0CountService.compute(context)
    );
  }
}
