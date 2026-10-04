import { Inject, Injectable } from "@nestjs/common";

import { FamilyUtilitiesService } from "./family-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Whether a Code's repeating unit is only parallel vertical bars running
 * from the top border tick to the bottom one in every column — the bars
 * family's whole-grid template.
 */
@Injectable()
export class IsBarsCharacteristicService implements CharacteristicEvaluator<boolean> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(FamilyUtilitiesService)
    private readonly familyUtilitiesService: FamilyUtilitiesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `isBars` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "compound",
    description:
      "Whether the repeating unit spans at least two rows and spells 4 across its top row, c across every interior row, and 8 across its bottom row.",
    formula: String.raw`\text{rows} \geq 2 \wedge \text{digits} = \text{4}^{c}\,\text{c}^{c(r-2)}\,\text{8}^{c}`,
    key: "isBars",
    name: "Is Bars",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Checks the unit spells the bars template: `4` rails on top, `c` pillars inside, `8` rails below. */
  public compute(context: CharacteristicContext): boolean {
    return this.familyUtilitiesService.matchesRails(context.code, {
      bottom: "8",
      middle: "c",
      top: "4",
    });
  }
}
