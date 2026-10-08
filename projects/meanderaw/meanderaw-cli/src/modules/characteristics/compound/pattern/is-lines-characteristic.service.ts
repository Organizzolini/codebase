import { Inject, Injectable } from "@nestjs/common";

import { BettiNumber1CountCharacteristicService } from "../../path/topology/betti-number-1-count-characteristic.service";
import { NorthEdgeCountCharacteristicService } from "../../submatrix/point/north-edge-count-characteristic.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Whether a Code's repeating unit is unbroken horizontal lines — no ink
 * runs north, and every row closes into its own loop around the band.
 */
@Injectable()
export class IsLinesCharacteristicService implements CharacteristicEvaluator<boolean> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(BettiNumber1CountCharacteristicService)
    private readonly bettiNumber1CountService: BettiNumber1CountCharacteristicService,
    @Inject(NorthEdgeCountCharacteristicService)
    private readonly northEdgeCountService: NorthEdgeCountCharacteristicService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `isLines` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "compound",
    description:
      "Whether no point carries a north arm and the band holds exactly one independent loop per row, so every row is an unbroken horizontal line.",
    formula: String.raw`n_{N} = 0 \wedge \beta_1 = r`,
    key: "isLines",
    name: "Is Lines",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Checks the ink is horizontal only and every row wraps around the band. */
  public compute(context: CharacteristicContext): boolean {
    return (
      this.northEdgeCountService.compute(context) === 0 &&
      this.bettiNumber1CountService.compute(context) === context.rows
    );
  }
}
