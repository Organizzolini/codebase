import { Inject, Injectable } from "@nestjs/common";

import { BettiNumber0CountCharacteristicService } from "../../path/topology/betti-number-0-count-characteristic.service";
import { BettiNumber1CountCharacteristicService } from "../../path/topology/betti-number-1-count-characteristic.service";
import { TotalTurnCountCharacteristicService } from "../../path/turn/total-turn-count-characteristic.service";
import { CrossCountCharacteristicService } from "../../submatrix/cross/cross-count-characteristic.service";
import { ForkCountCharacteristicService } from "../../submatrix/fork/fork-count-characteristic.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Whether a Code's repeating unit is a comb — one tree with at least two
 * forks whose teeth branch off a spine almost without turning: two quarter
 * turns at most, for the spine's own ends.
 */
@Injectable()
export class IsCombCharacteristicService implements CharacteristicEvaluator<boolean> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(BettiNumber0CountCharacteristicService)
    private readonly bettiNumber0CountService: BettiNumber0CountCharacteristicService,
    @Inject(BettiNumber1CountCharacteristicService)
    private readonly bettiNumber1CountService: BettiNumber1CountCharacteristicService,
    @Inject(CrossCountCharacteristicService)
    private readonly crossCountService: CrossCountCharacteristicService,
    @Inject(ForkCountCharacteristicService)
    private readonly forkCountService: ForkCountCharacteristicService,
    @Inject(TotalTurnCountCharacteristicService)
    private readonly totalTurnCountService: TotalTurnCountCharacteristicService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `isComb` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "compound",
    description:
      "Whether the unit is one acyclic component with no cross, at least two forks, and at most two quarter turns.",
    formula: String.raw`\beta_0 = 1 \wedge \beta_1 = 0 \wedge n_{\text{cross}} = 0 \wedge n_{\text{fork}} \geq 2 \wedge \tau \leq 2`,
    key: "isComb",
    name: "Is Comb",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Checks the unit is one straight-toothed tree with at least two forks. */
  public compute(context: CharacteristicContext): boolean {
    return (
      this.bettiNumber0CountService.compute(context) === 1 &&
      this.bettiNumber1CountService.compute(context) === 0 &&
      this.crossCountService.compute(context) === 0 &&
      this.forkCountService.compute(context) >= 2 &&
      this.totalTurnCountService.compute(context) <= 2
    );
  }
}
