import { Inject, Injectable } from "@nestjs/common";

import { BettiNumber0CountCharacteristicService } from "../../path/topology/betti-number-0-count-characteristic.service";
import { BettiNumber1CountCharacteristicService } from "../../path/topology/betti-number-1-count-characteristic.service";
import { FreeEndCountCharacteristicService } from "../../path/topology/free-end-count-characteristic.service";
import { CompoundUtilitiesService } from "../compound-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Whether a Code's repeating unit is one closed loop — a single connected,
 * junction-free strand that closes exactly one cycle and leaves no free end.
 */
@Injectable()
export class IsClosedLoopCharacteristicService implements CharacteristicEvaluator<boolean> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(BettiNumber0CountCharacteristicService)
    private readonly bettiNumber0CountService: BettiNumber0CountCharacteristicService,
    @Inject(BettiNumber1CountCharacteristicService)
    private readonly bettiNumber1CountService: BettiNumber1CountCharacteristicService,
    @Inject(CompoundUtilitiesService)
    private readonly compoundUtilitiesService: CompoundUtilitiesService,
    @Inject(FreeEndCountCharacteristicService)
    private readonly freeEndCountService: FreeEndCountCharacteristicService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `isClosedLoop` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "compound",
    description:
      "Whether the repeating unit is one junction-free closed loop: one component, exactly one cycle, and no free ends.",
    formula: String.raw`\beta_0 = 1 \wedge \beta_1 = 1 \wedge \left|V_1\right| = 0 \wedge n_{\text{fork}} = n_{\text{cross}} = 0`,
    key: "isClosedLoop",
    name: "Is Closed Loop",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Checks the unit is one junction-free component closing one cycle with no free ends. */
  public compute(context: CharacteristicContext): boolean {
    return (
      this.bettiNumber0CountService.compute(context) === 1 &&
      this.bettiNumber1CountService.compute(context) === 1 &&
      this.freeEndCountService.compute(context) === 0 &&
      this.compoundUtilitiesService.isJunctionFree(context)
    );
  }
}
