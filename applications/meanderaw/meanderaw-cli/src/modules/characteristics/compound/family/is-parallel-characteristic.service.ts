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
 * Whether a Code's repeating unit is a bundle of parallel open strands —
 * junction-free and acyclic, at an even pitch, with one more strand than
 * half the pitch and two free ends per strand. The pitch is the unit's
 * own column count.
 */
@Injectable()
export class IsParallelCharacteristicService implements CharacteristicEvaluator<boolean> {
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

  /** Names and explains `isParallel` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "compound",
    description:
      "Whether the repeating unit is junction-free and acyclic at an even pitch p, with p/2 + 1 components and two free ends per component.",
    formula: String.raw`n_{\text{fork}} = n_{\text{cross}} = 0 \wedge \beta_1 = 0 \wedge p \text{ mod } 2 = 0 \wedge \beta_0 = \frac{p}{2} + 1 \wedge \left|V_1\right| = 2\beta_0`,
    key: "isParallel",
    name: "Is Parallel",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Checks the unit is a junction-free, acyclic bundle of `pitch / 2 + 1` open strands at an even pitch. */
  public compute(context: CharacteristicContext): boolean {
    const pitch = context.columns;
    const components = this.bettiNumber0CountService.compute(context);

    return (
      this.compoundUtilitiesService.isJunctionFree(context) &&
      this.bettiNumber1CountService.compute(context) === 0 &&
      pitch % 2 === 0 &&
      components === pitch / 2 + 1 &&
      this.freeEndCountService.compute(context) === 2 * components
    );
  }
}
