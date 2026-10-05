import { Inject, Injectable } from "@nestjs/common";

import { ReversesAtItsTightestTurnCharacteristicService } from "../../path/turn/reverses-at-its-tightest-turn-characteristic.service";

import { StrandUtilitiesService } from "./strand-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Whether a Code's repeating unit is a clasp — a tile-bound coil that
 * reverses at its tightest turn, of two open strands at pitch `rows + 1`
 * or of four open strands at pitch `2 rows + 2`. The pitch is the unit's
 * own column count.
 */
@Injectable()
export class IsClaspsCharacteristicService implements CharacteristicEvaluator<boolean> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(ReversesAtItsTightestTurnCharacteristicService)
    private readonly reversesAtItsTightestTurnService: ReversesAtItsTightestTurnCharacteristicService,
    @Inject(StrandUtilitiesService)
    private readonly strandUtilitiesService: StrandUtilitiesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `isClasps` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "compound",
    description:
      "Whether the repeating unit is a junction-free, acyclic, fully inked, dot-free coil that never crosses the tile edge, runs rows - 1 both ways, and reverses at its tightest turn, made of two strands at pitch rows + 1 or four strands at pitch 2 rows + 2.",
    formula: String.raw`\text{coil} \wedge \text{reversesAtItsTightestTurn} \wedge \left( \left(\beta_0 = 2 \wedge \left|V_1\right| = 4 \wedge p = r + 1\right) \vee \left(\beta_0 = 4 \wedge \left|V_1\right| = 8 \wedge p = 2r + 2\right) \right)`,
    key: "isClasps",
    name: "Is Clasps",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Checks the unit is a reversing tile-bound coil of two or four open strands at a clasp's pitch. */
  public compute(context: CharacteristicContext): boolean {
    const { columns, rows } = context;
    const strands = this.strandUtilitiesService;

    return (
      strands.isTileBoundCoil(context) &&
      this.reversesAtItsTightestTurnService.compute(context) &&
      ((strands.hasStrandEnds(context, 2) && columns === rows + 1) ||
        (strands.hasStrandEnds(context, 4) && columns === 2 * rows + 2))
    );
  }
}
