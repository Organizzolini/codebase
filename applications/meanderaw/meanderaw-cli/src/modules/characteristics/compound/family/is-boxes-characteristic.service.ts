import { Inject, Injectable } from "@nestjs/common";

import { EndsAreLatticeNeighborsCharacteristicService } from "../../path/end/ends-are-lattice-neighbors-characteristic.service";
import { TileCrossingCountCharacteristicService } from "../../path/tile-crossing/tile-crossing-count-characteristic.service";
import { IsSingleArcCharacteristicService } from "../structure/is-single-arc-characteristic.service";

import { IsWaterfallsCharacteristicService } from "./is-waterfalls-characteristic.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Whether a Code's repeating unit is a boxes strand — one open arc, one
 * column narrower than it is deep, that crosses the tile edge with its two
 * ends apart, and that is not a waterfall. The pitch is the unit's own
 * column count.
 */
@Injectable()
export class IsBoxesCharacteristicService implements CharacteristicEvaluator<boolean> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(EndsAreLatticeNeighborsCharacteristicService)
    private readonly endsAreLatticeNeighborsService: EndsAreLatticeNeighborsCharacteristicService,
    @Inject(IsSingleArcCharacteristicService)
    private readonly isSingleArcService: IsSingleArcCharacteristicService,
    @Inject(IsWaterfallsCharacteristicService)
    private readonly isWaterfallsService: IsWaterfallsCharacteristicService,
    @Inject(TileCrossingCountCharacteristicService)
    private readonly tileCrossingCountService: TileCrossingCountCharacteristicService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `isBoxes` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "compound",
    description:
      "Whether the repeating unit is one open arc at pitch rows - 1 that crosses the tile edge, whose ends are not lattice neighbors, and that is not a waterfall.",
    formula: String.raw`\text{isSingleArc} \wedge p = r - 1 \wedge n_{\text{tile}} > 0 \wedge \neg\,\text{endsAreLatticeNeighbors} \wedge \neg\,\text{isWaterfalls}`,
    key: "isBoxes",
    name: "Is Boxes",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Checks the unit is a tile-crossing open arc at pitch `rows - 1` with its ends apart and no waterfall. */
  public compute(context: CharacteristicContext): boolean {
    return (
      this.isSingleArcService.compute(context) &&
      context.columns === context.rows - 1 &&
      this.tileCrossingCountService.compute(context) > 0 &&
      !this.endsAreLatticeNeighborsService.compute(context) &&
      !this.isWaterfallsService.compute(context)
    );
  }
}
