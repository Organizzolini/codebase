import { Inject, Injectable } from "@nestjs/common";

import { BettiNumber0CountCharacteristicService } from "../../path/topology/betti-number-0-count-characteristic.service";
import { ForkCountCharacteristicService } from "../../submatrix/fork/fork-count-characteristic.service";
import { DotCountCharacteristicService } from "../../submatrix/point/dot-count-characteristic.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Whether a Code's repeating unit is stippled — several pieces of ink,
 * bare dots among them, with at least one three-armed branch point.
 */
@Injectable()
export class IsStippledCharacteristicService implements CharacteristicEvaluator<boolean> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(BettiNumber0CountCharacteristicService)
    private readonly bettiNumber0CountService: BettiNumber0CountCharacteristicService,
    @Inject(DotCountCharacteristicService)
    private readonly dotCountService: DotCountCharacteristicService,
    @Inject(ForkCountCharacteristicService)
    private readonly forkCountService: ForkCountCharacteristicService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `isStippled` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "compound",
    description:
      "Whether the repeating unit has more than one component, at least one bare dot, and at least one fork.",
    formula: String.raw`\beta_0 > 1 \wedge n_{\text{dot}} > 0 \wedge n_{\text{fork}} > 0`,
    key: "isStippled",
    name: "Is Stippled",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Checks the unit has several components, a bare dot, and a fork. */
  public compute(context: CharacteristicContext): boolean {
    return (
      this.bettiNumber0CountService.compute(context) > 1 &&
      this.dotCountService.compute(context) > 0 &&
      this.forkCountService.compute(context) > 0
    );
  }
}
