import { Inject, Injectable } from "@nestjs/common";

import { BettiNumber0CountCharacteristicService } from "../../path/topology/betti-number-0-count-characteristic.service";
import { BettiNumber1CountCharacteristicService } from "../../path/topology/betti-number-1-count-characteristic.service";
import { CrossCountCharacteristicService } from "../../submatrix/cross/cross-count-characteristic.service";
import { ForkCountCharacteristicService } from "../../submatrix/fork/fork-count-characteristic.service";
import { DotCountCharacteristicService } from "../../submatrix/point/dot-count-characteristic.service";

import { IsArcadeCharacteristicService } from "./is-arcade-characteristic.service";
import { IsCombCharacteristicService } from "./is-comb-characteristic.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Whether a Code's repeating unit is a pure tree — one connected, acyclic
 * piece of ink branching at two or more three-armed points, with no cross,
 * no bare dot, and neither a comb nor an arcade.
 */
@Injectable()
export class IsPureTreeCharacteristicService implements CharacteristicEvaluator<boolean> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(BettiNumber0CountCharacteristicService)
    private readonly bettiNumber0CountService: BettiNumber0CountCharacteristicService,
    @Inject(BettiNumber1CountCharacteristicService)
    private readonly bettiNumber1CountService: BettiNumber1CountCharacteristicService,
    @Inject(CrossCountCharacteristicService)
    private readonly crossCountService: CrossCountCharacteristicService,
    @Inject(DotCountCharacteristicService)
    private readonly dotCountService: DotCountCharacteristicService,
    @Inject(ForkCountCharacteristicService)
    private readonly forkCountService: ForkCountCharacteristicService,
    @Inject(IsArcadeCharacteristicService)
    private readonly isArcadeService: IsArcadeCharacteristicService,
    @Inject(IsCombCharacteristicService)
    private readonly isCombService: IsCombCharacteristicService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `isPureTree` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "compound",
    description:
      "Whether the repeating unit is one acyclic component with at least two forks, no cross, no bare dots, and is neither a comb nor an arcade.",
    formula: String.raw`\beta_0 = 1 \wedge \beta_1 = 0 \wedge n_{\text{fork}} \geq 2 \wedge n_{\text{cross}} = 0 \wedge n_{\text{dot}} = 0 \wedge \neg\,\text{isComb} \wedge \neg\,\text{isArcade}`,
    key: "isPureTree",
    name: "Is Pure Tree",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Checks the unit is one acyclic multi-fork component with no cross, no dots, no comb, and no arcade. */
  public compute(context: CharacteristicContext): boolean {
    return (
      this.bettiNumber0CountService.compute(context) === 1 &&
      this.bettiNumber1CountService.compute(context) === 0 &&
      this.forkCountService.compute(context) >= 2 &&
      this.crossCountService.compute(context) === 0 &&
      this.dotCountService.compute(context) === 0 &&
      !this.isCombService.compute(context) &&
      !this.isArcadeService.compute(context)
    );
  }
}
