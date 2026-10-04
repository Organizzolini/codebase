import { Inject, Injectable } from "@nestjs/common";

import { ConnectivityService } from "../../connectivity/connectivity.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the points where one repeat's ink terminates — vertices of degree
 * one in the Code read as a graph over the cyclic band. An edge is claimed by
 * either of its ends, so a degree here is the graph's rather than the
 * number of bits a digit happens to spell.
 */
@Injectable()
export class FreeEndCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(ConnectivityService)
    private readonly connectivityService: ConnectivityService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `freeEndCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "path",
    description:
      "The number of points where the ink terminates — vertices of degree one in the repeat graph over the cyclic band. A single-column point wrapping onto itself leaves both ways, so it is no free end.",
    formula: String.raw`\left|\{\, v \in V : \deg(v) = 1 \,\}\right|`,
    key: "freeEndCount",
    name: "Free End Count",
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Counts the degree-one vertices of the wrapped repeat graph. */
  public compute(context: CharacteristicContext): number {
    return this.connectivityService.connectivity(context.matrix).freeEnds;
  }
}
