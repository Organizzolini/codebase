import { Inject, Injectable } from "@nestjs/common";

import { ConnectivityService } from "../../connectivity/connectivity.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the edges that cross the tile boundary — the eastward edges leaving
 * the last column that only exist because the Code repeats — as the
 * difference between the repeat read as a cyclic band and the same repeat
 * read as a lone tile. Replaces the `crossesTheSeam` flag, which is this
 * count being nonzero.
 */
@Injectable()
export class TileCrossingCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(ConnectivityService)
    private readonly connectivityService: ConnectivityService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `tileCrossingCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "path",
    description:
      "The number of edges that cross the tile boundary — the join where the tile's last column meets its first when the Code is read as a repeating band. Nonzero exactly when the ink crosses the tile boundary at all.",
    formula: String.raw`|E_{\text{band}}| - |E_{\text{tile}}|`,
    key: "tileCrossingCount",
    name: "Tile Crossing Count",
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Counts the edges the band holds that the lone tile does not. */
  public compute(context: CharacteristicContext): number {
    const { matrix } = context;

    return (
      this.connectivityService.edges(matrix, false).length -
      this.connectivityService.edges(matrix, true).length
    );
  }
}
