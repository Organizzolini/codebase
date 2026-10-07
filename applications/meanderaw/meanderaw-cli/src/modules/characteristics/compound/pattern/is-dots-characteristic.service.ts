import { Inject, Injectable } from "@nestjs/common";

import { InkPointCountCharacteristicService } from "../../submatrix/point/ink-point-count-characteristic.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Whether a Code's repeating unit carries no ink at all — every point a
 * bare dot.
 */
@Injectable()
export class IsDotsCharacteristicService implements CharacteristicEvaluator<boolean> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(InkPointCountCharacteristicService)
    private readonly inkPointCountService: InkPointCountCharacteristicService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `isDots` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "compound",
    description: "Whether no point of the repeating unit carries ink.",
    formula: String.raw`\left|\{\, p \in M : \text{arms}(p) \neq \varnothing \,\}\right| = 0`,
    key: "isDots",
    name: "Is Dots",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Checks no point of the unit is inked. */
  public compute(context: CharacteristicContext): boolean {
    return this.inkPointCountService.compute(context) === 0;
  }
}
