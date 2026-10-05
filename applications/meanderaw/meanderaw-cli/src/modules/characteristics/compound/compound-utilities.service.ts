import { Inject, Injectable } from "@nestjs/common";

import { CrossCountCharacteristicService } from "../submatrix/cross/cross-count-characteristic.service";
import { ForkCountCharacteristicService } from "../submatrix/fork/fork-count-characteristic.service";

import type { CharacteristicContext } from "../characteristics.types";

/**
 * Shared readings every compound predicate that asks for junction-free ink
 * injects, so the question is answered once, from the fork and cross
 * characteristics, rather than re-derived per predicate.
 */
@Injectable()
export class CompoundUtilitiesService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(CrossCountCharacteristicService)
    private readonly crossCountService: CrossCountCharacteristicService,
    @Inject(ForkCountCharacteristicService)
    private readonly forkCountService: ForkCountCharacteristicService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Whether no point of the repeat carries three or four arms — no fork and no cross anywhere. */
  public isJunctionFree(context: CharacteristicContext): boolean {
    return (
      this.forkCountService.compute(context) === 0 &&
      this.crossCountService.compute(context) === 0
    );
  }
}
