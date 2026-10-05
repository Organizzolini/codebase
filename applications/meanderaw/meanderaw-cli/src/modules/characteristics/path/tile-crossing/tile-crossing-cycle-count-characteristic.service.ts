import { Inject, Injectable } from "@nestjs/common";

import { ConnectivityService } from "../../connectivity/connectivity.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the independent loops that close only by crossing the tile
 * boundary: loops the cyclic band holds that one lone tile does not.
 * Replaces `seamCycles` with the same arithmetic.
 */
@Injectable()
export class TileCrossingCycleCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(ConnectivityService)
    private readonly connectivityService: ConnectivityService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `tileCrossingCycleCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "path",
    description:
      "How many independent loops close only by crossing the tile boundary: loops of the repeat read as a cyclic band minus loops of the same repeat read as a lone tile.",
    formula: String.raw`b_1(G_{\text{band}}) - b_1(G_{\text{tile}})`,
    key: "tileCrossingCycleCount",
    name: "Tile Crossing Cycle Count",
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Subtracts the lone tile's loop count from the band's. */
  public compute(context: CharacteristicContext): number {
    const { matrix } = context;

    return (
      this.connectivityService.connectivity(matrix).cycles -
      this.connectivityService.connectivity(matrix, true).cycles
    );
  }
}
