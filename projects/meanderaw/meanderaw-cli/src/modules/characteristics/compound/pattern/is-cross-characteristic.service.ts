import { Inject, Injectable } from "@nestjs/common";

import { FreeEndCountCharacteristicService } from "../../path/topology/free-end-count-characteristic.service";
import { CrossCountCharacteristicService } from "../../submatrix/cross/cross-count-characteristic.service";
import { ForkCountCharacteristicService } from "../../submatrix/fork/fork-count-characteristic.service";
import { DotCountCharacteristicService } from "../../submatrix/point/dot-count-characteristic.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Whether a Code's repeating unit is lines that cross — at least one
 * four-armed point, with no fork, no free end, and no bare dot, so every
 * line runs on through every junction it meets.
 */
@Injectable()
export class IsCrossCharacteristicService implements CharacteristicEvaluator<boolean> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(CrossCountCharacteristicService)
    private readonly crossCountService: CrossCountCharacteristicService,
    @Inject(DotCountCharacteristicService)
    private readonly dotCountService: DotCountCharacteristicService,
    @Inject(ForkCountCharacteristicService)
    private readonly forkCountService: ForkCountCharacteristicService,
    @Inject(FreeEndCountCharacteristicService)
    private readonly freeEndCountService: FreeEndCountCharacteristicService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `isCross` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "compound",
    description:
      "Whether the unit holds at least one cross point and no fork, free end, or bare dot.",
    formula: String.raw`n_{\text{cross}} > 0 \wedge n_{\text{fork}} = 0 \wedge \left|V_1\right| = 0 \wedge n_{\text{dot}} = 0`,
    key: "isCross",
    name: "Is Cross",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Checks the unit crosses itself with no fork, loose end, or dot. */
  public compute(context: CharacteristicContext): boolean {
    return (
      this.crossCountService.compute(context) > 0 &&
      this.forkCountService.compute(context) === 0 &&
      this.freeEndCountService.compute(context) === 0 &&
      this.dotCountService.compute(context) === 0
    );
  }
}
