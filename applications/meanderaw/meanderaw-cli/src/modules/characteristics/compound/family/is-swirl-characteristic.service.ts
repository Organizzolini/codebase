import { Inject, Injectable } from "@nestjs/common";

import { EndsOnBorderRulesCharacteristicService } from "../../path/end/ends-on-border-rules-characteristic.service";

import { StrandUtilitiesService } from "./strand-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Whether a Code's repeating unit is a swirl — a tile-bound coil that ends
 * off the border rules, of one open strand at pitch `2 rows - 1` or of two
 * open strands at pitch `4 rows - 2`. The pitch is the unit's own column
 * count.
 */
@Injectable()
export class IsSwirlCharacteristicService implements CharacteristicEvaluator<boolean> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(EndsOnBorderRulesCharacteristicService)
    private readonly endsOnBorderRulesService: EndsOnBorderRulesCharacteristicService,
    @Inject(StrandUtilitiesService)
    private readonly strandUtilitiesService: StrandUtilitiesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `isSwirl` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "compound",
    description:
      "Whether the repeating unit is a junction-free, acyclic, fully inked, dot-free coil that never crosses the tile edge, runs rows - 1 both ways, and ends off the border rules, made of one strand at pitch 2 rows - 1 or two strands at pitch 4 rows - 2.",
    formula: String.raw`\text{coil} \wedge \neg\,\text{endsOnBorderRules} \wedge \left( \left(\beta_0 = 1 \wedge \left|V_1\right| = 2 \wedge p = 2r - 1\right) \vee \left(\beta_0 = 2 \wedge \left|V_1\right| = 4 \wedge p = 4r - 2\right) \right)`,
    key: "isSwirl",
    name: "Is Swirl",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Checks the unit is a tile-bound coil off the border rules, of one or two open strands at a swirl's pitch. */
  public compute(context: CharacteristicContext): boolean {
    const { columns, rows } = context;
    const strands = this.strandUtilitiesService;

    return (
      strands.isTileBoundCoil(context) &&
      !this.endsOnBorderRulesService.compute(context) &&
      ((strands.hasStrandEnds(context, 1) && columns === 2 * rows - 1) ||
        (strands.hasStrandEnds(context, 2) && columns === 4 * rows - 2))
    );
  }
}
