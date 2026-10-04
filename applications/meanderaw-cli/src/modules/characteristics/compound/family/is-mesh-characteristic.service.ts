import { Inject, Injectable } from "@nestjs/common";

import { FamilyUtilitiesService } from "./family-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Whether a Code's repeating unit carries every possible horizontal and
 * vertical connection across the lattice — the mesh family's whole-grid
 * template.
 */
@Injectable()
export class IsMeshCharacteristicService implements CharacteristicEvaluator<boolean> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(FamilyUtilitiesService)
    private readonly familyUtilitiesService: FamilyUtilitiesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `isMesh` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "compound",
    description:
      "Whether the repeating unit spans at least two rows and spells 7 across its top row, f across every interior row, and b across its bottom row.",
    formula: String.raw`\text{rows} \geq 2 \wedge \text{digits} = \text{7}^{c}\,\text{f}^{c(r-2)}\,\text{b}^{c}`,
    key: "isMesh",
    name: "Is Mesh",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Checks the unit spells the mesh template: `7` along the top, `f` inside, `b` along the bottom. */
  public compute(context: CharacteristicContext): boolean {
    return this.familyUtilitiesService.matchesRails(context.code, {
      bottom: "b",
      middle: "f",
      top: "7",
    });
  }
}
