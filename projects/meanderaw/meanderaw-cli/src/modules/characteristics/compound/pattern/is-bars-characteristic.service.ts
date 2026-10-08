import { Inject, Injectable } from "@nestjs/common";

import { DotCountCharacteristicService } from "../../submatrix/point/dot-count-characteristic.service";
import { EastEdgeCountCharacteristicService } from "../../submatrix/point/east-edge-count-characteristic.service";
import { EdgeCountCharacteristicService } from "../../submatrix/point/edge-count-characteristic.service";
import { LongestVerticalRunLengthCharacteristicService } from "../../submatrix/run/longest-vertical-run-length-characteristic.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Whether a Code's repeating unit is vertical bars only — no ink runs
 * east, every point is inked, and some bar spans the band's full depth.
 */
@Injectable()
export class IsBarsCharacteristicService implements CharacteristicEvaluator<boolean> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(DotCountCharacteristicService)
    private readonly dotCountService: DotCountCharacteristicService,
    @Inject(EastEdgeCountCharacteristicService)
    private readonly eastEdgeCountService: EastEdgeCountCharacteristicService,
    @Inject(EdgeCountCharacteristicService)
    private readonly edgeCountService: EdgeCountCharacteristicService,
    @Inject(LongestVerticalRunLengthCharacteristicService)
    private readonly longestVerticalRunLengthService: LongestVerticalRunLengthCharacteristicService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `isBars` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "compound",
    description:
      "Whether no point carries an east arm, no point is a bare dot, and the longest vertical run spans rows - 1 edges.",
    formula: String.raw`n_{E} = 0 \wedge n_{\text{dot}} = 0 \wedge \ell_v = r - 1 \wedge |E| > 0`,
    key: "isBars",
    name: "Is Bars",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Checks the ink is vertical only, fully inked, and spans the band. */
  public compute(context: CharacteristicContext): boolean {
    return (
      this.edgeCountService.compute(context) > 0 &&
      this.eastEdgeCountService.compute(context) === 0 &&
      this.dotCountService.compute(context) === 0 &&
      this.longestVerticalRunLengthService.compute(context) === context.rows - 1
    );
  }
}
