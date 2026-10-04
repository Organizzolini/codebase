import { Inject, Injectable } from "@nestjs/common";

import { StrandUtilitiesService } from "./strand-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Whether a Code's repeating unit is a whirl — a tile-bound coil of one
 * open strand at pitch `rows + 1` (or `rows`, from four rows down), or of
 * two open strands at pitch `2 rows + 2` (or `2 rows`, from four rows
 * down). The pitch is the unit's own column count.
 */
@Injectable()
export class IsWhirlCharacteristicService implements CharacteristicEvaluator<boolean> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(StrandUtilitiesService)
    private readonly strandUtilitiesService: StrandUtilitiesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `isWhirl` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "compound",
    description:
      "Whether the repeating unit is a junction-free, acyclic, fully inked, dot-free coil that never crosses the tile edge and runs rows - 1 both ways, made of one strand at pitch rows + 1 (or rows, with at least four rows) or two strands at pitch 2 rows + 2 (or 2 rows, with at least four rows).",
    formula: String.raw`\text{coil} \wedge \left( \left(\beta_0 = 1 \wedge \left|V_1\right| = 2 \wedge \left(p = r + 1 \vee (p = r \wedge r \geq 4)\right)\right) \vee \left(\beta_0 = 2 \wedge \left|V_1\right| = 4 \wedge \left(p = 2r + 2 \vee (p = 2r \wedge r \geq 4)\right)\right) \right)`,
    key: "isWhirl",
    name: "Is Whirl",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  /** Whether two open strands sit at pitch `2 rows + 2`, or at `2 rows` from four rows down. */
  private isDoubleWhirl(context: CharacteristicContext): boolean {
    const { columns, rows } = context;

    return (
      this.strandUtilitiesService.hasStrandEnds(context, 2) &&
      ((columns === 2 * rows && rows >= 4) || columns === 2 * rows + 2)
    );
  }

  /** Whether one open strand sits at pitch `rows + 1`, or at `rows` from four rows down. */
  private isSingleWhirl(context: CharacteristicContext): boolean {
    const { columns, rows } = context;

    return (
      this.strandUtilitiesService.hasStrandEnds(context, 1) &&
      ((columns === rows && rows >= 4) || columns === rows + 1)
    );
  }

  // 🌎 Public Methods

  /** Checks the unit is a tile-bound coil of one or two open strands at a whirl's pitch. */
  public compute(context: CharacteristicContext): boolean {
    return (
      this.strandUtilitiesService.isTileBoundCoil(context) &&
      (this.isSingleWhirl(context) || this.isDoubleWhirl(context))
    );
  }
}
