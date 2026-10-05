import { Inject, Injectable } from "@nestjs/common";

import { ConnectivityService } from "../../connectivity/connectivity.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the independent closed loops of one repeat — the first Betti
 * number $b_1$, its cycle rank — as edges minus vertices plus components of
 * the Code read as a graph over the cyclic band. A loop that closes only by
 * crossing the tile boundary counts, since the band really does close it.
 */
@Injectable()
export class BettiNumber1CountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(ConnectivityService)
    private readonly connectivityService: ConnectivityService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `bettiNumber1Count` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "path",
    description:
      "The first Betti number of one repeat's ink read as a graph over the cyclic band: how many independent closed loops it holds, including loops that close only across the tile boundary.",
    formula: String.raw`b_1 = |E| - |V| + b_0`,
    key: "bettiNumber1Count",
    name: "Betti Number 1 Count",
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Counts the independent loops of the wrapped repeat graph. */
  public compute(context: CharacteristicContext): number {
    return this.connectivityService.connectivity(context.matrix).cycles;
  }
}
