import { Inject, Injectable } from "@nestjs/common";

import { TileCrossingCountCharacteristicService } from "../../path/tile-crossing/tile-crossing-count-characteristic.service";
import { FreeEndCountCharacteristicService } from "../../path/topology/free-end-count-characteristic.service";
import { CornerCountCharacteristicService } from "../../submatrix/corner/corner-count-characteristic.service";
import { CrossCountCharacteristicService } from "../../submatrix/cross/cross-count-characteristic.service";
import { DotCountCharacteristicService } from "../../submatrix/point/dot-count-characteristic.service";
import { LongestVerticalRunLengthCharacteristicService } from "../../submatrix/run/longest-vertical-run-length-characteristic.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Whether a Code's repeating unit is a full grid — crossing lines with no
 * corner, no free end, and no bare dot, every row wrapping across the tile
 * edge and some column spanning the band's full depth.
 */
@Injectable()
export class IsMeshCharacteristicService implements CharacteristicEvaluator<boolean> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(CornerCountCharacteristicService)
    private readonly cornerCountService: CornerCountCharacteristicService,
    @Inject(CrossCountCharacteristicService)
    private readonly crossCountService: CrossCountCharacteristicService,
    @Inject(DotCountCharacteristicService)
    private readonly dotCountService: DotCountCharacteristicService,
    @Inject(FreeEndCountCharacteristicService)
    private readonly freeEndCountService: FreeEndCountCharacteristicService,
    @Inject(LongestVerticalRunLengthCharacteristicService)
    private readonly longestVerticalRunLengthService: LongestVerticalRunLengthCharacteristicService,
    @Inject(TileCrossingCountCharacteristicService)
    private readonly tileCrossingCountService: TileCrossingCountCharacteristicService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `isMesh` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "compound",
    description:
      "Whether the unit holds a cross, no corner, no free end, and no bare dot, crosses the tile edge once per row, and runs a vertical line rows - 1 edges long.",
    formula: String.raw`n_{\text{cross}} > 0 \wedge n_{\text{corner}} = 0 \wedge \left|V_1\right| = 0 \wedge n_{\text{dot}} = 0 \wedge n_{\text{tile}} = r \wedge \ell_v = r - 1`,
    key: "isMesh",
    name: "Is Mesh",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Checks the unit is crossing lines that span both directions with nothing loose. */
  public compute(context: CharacteristicContext): boolean {
    const { rows } = context;

    return (
      this.crossCountService.compute(context) > 0 &&
      this.cornerCountService.compute(context) === 0 &&
      this.freeEndCountService.compute(context) === 0 &&
      this.dotCountService.compute(context) === 0 &&
      this.tileCrossingCountService.compute(context) === rows &&
      this.longestVerticalRunLengthService.compute(context) === rows - 1
    );
  }
}
