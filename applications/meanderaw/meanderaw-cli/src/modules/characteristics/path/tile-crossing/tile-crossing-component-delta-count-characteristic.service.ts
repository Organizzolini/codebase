import { Inject, Injectable } from "@nestjs/common";

import { ConnectivityService } from "../../connectivity/connectivity.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts how many connected components the tile boundary merges: pieces
 * that are separate within one lone tile but join once the tile repeats.
 * Replaces `seamComponents` with the same arithmetic.
 */
@Injectable()
export class TileCrossingComponentDeltaCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(ConnectivityService)
    private readonly connectivityService: ConnectivityService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `tileCrossingComponentDeltaCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "path",
    description:
      "How many connected components the tile boundary merges: components of the repeat read as a lone tile minus components of the same repeat read as a cyclic band.",
    formula: String.raw`b_0(G_{\text{tile}}) - b_0(G_{\text{band}})`,
    key: "tileCrossingComponentDeltaCount",
    name: "Tile Crossing Component Delta Count",
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Subtracts the band's component count from the lone tile's. */
  public compute(context: CharacteristicContext): number {
    const { matrix } = context;

    return (
      this.connectivityService.connectivity(matrix, true).components -
      this.connectivityService.connectivity(matrix).components
    );
  }
}
