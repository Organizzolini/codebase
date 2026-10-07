import { Inject, Injectable } from "@nestjs/common";

import { BettiNumber0CountCharacteristicService } from "../../path/topology/betti-number-0-count-characteristic.service";
import { BettiNumber1CountCharacteristicService } from "../../path/topology/betti-number-1-count-characteristic.service";
import { FreeEndCountCharacteristicService } from "../../path/topology/free-end-count-characteristic.service";
import { CrossCountCharacteristicService } from "../../submatrix/cross/cross-count-characteristic.service";
import { ForkCountCharacteristicService } from "../../submatrix/fork/fork-count-characteristic.service";
import { DotCountCharacteristicService } from "../../submatrix/point/dot-count-characteristic.service";

import { IsCombCharacteristicService } from "./is-comb-characteristic.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Whether a Code's repeating unit is a single fork — one connected, acyclic
 * piece of ink branching at exactly one three-armed point into three free
 * ends, with no cross, no bare dot, and no comb.
 */
@Injectable()
export class IsForkCharacteristicService implements CharacteristicEvaluator<boolean> {
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
    @Inject(FreeEndCountCharacteristicService)
    private readonly freeEndCountService: FreeEndCountCharacteristicService,
    @Inject(IsCombCharacteristicService)
    private readonly isCombService: IsCombCharacteristicService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `isFork` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "compound",
    description:
      "Whether the repeating unit is one acyclic component with exactly one fork, no cross, three free ends, no bare dots, and is not a comb.",
    formula: String.raw`\beta_0 = 1 \wedge \beta_1 = 0 \wedge n_{\text{fork}} = 1 \wedge n_{\text{cross}} = 0 \wedge \left|V_1\right| = 3 \wedge n_{\text{dot}} = 0 \wedge \neg\,\text{isComb}`,
    key: "isFork",
    name: "Is Fork",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Checks the unit is one acyclic single-fork component with three free ends, no dots, and no comb. */
  public compute(context: CharacteristicContext): boolean {
    return (
      this.bettiNumber0CountService.compute(context) === 1 &&
      this.bettiNumber1CountService.compute(context) === 0 &&
      this.forkCountService.compute(context) === 1 &&
      this.crossCountService.compute(context) === 0 &&
      this.freeEndCountService.compute(context) === 3 &&
      this.dotCountService.compute(context) === 0 &&
      !this.isCombService.compute(context)
    );
  }
}
