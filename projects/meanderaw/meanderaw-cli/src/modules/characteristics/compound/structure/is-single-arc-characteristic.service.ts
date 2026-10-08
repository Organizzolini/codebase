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
 * Whether a Code's repeating unit is one open arc — a single connected,
 * acyclic, junction-free strand with exactly two free ends.
 */
@Injectable()
export class IsSingleArcCharacteristicService implements CharacteristicEvaluator<boolean> {
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

  /** Names and explains `isSingleArc` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "compound",
    description:
      "Whether the repeating unit is one junction-free open arc: one component, no cycle, and exactly two free ends.",
    formula: String.raw`\beta_0 = 1 \wedge \beta_1 = 0 \wedge \left|V_1\right| = 2 \wedge n_{\text{fork}} = n_{\text{cross}} = 0`,
    key: "isSingleArc",
    name: "Is Single Arc",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Checks the unit is one junction-free component with no cycle and two free ends. */
  public compute(context: CharacteristicContext): boolean {
    return (
      this.bettiNumber0CountService.compute(context) === 1 &&
      this.bettiNumber1CountService.compute(context) === 0 &&
      this.freeEndCountService.compute(context) === 2 &&
      this.compoundUtilitiesService.isJunctionFree(context)
    );
  }
}
