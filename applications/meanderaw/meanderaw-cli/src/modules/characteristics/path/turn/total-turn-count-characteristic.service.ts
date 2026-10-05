import { Inject, Injectable } from "@nestjs/common";

import { ConnectivityService } from "../../connectivity/connectivity.service";
import { PathUtilitiesService } from "../path-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the quarter turns one repeat's ink makes as it runs along its
 * strands — maximal runs through degree-two points of the repeat graph over
 * the cyclic band — whichever way each turn goes.
 */
@Injectable()
export class TotalTurnCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(ConnectivityService)
    private readonly connectivityService: ConnectivityService,
    @Inject(PathUtilitiesService)
    private readonly pathUtilitiesService: PathUtilitiesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `totalTurnCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "path",
    description:
      "The number of quarter turns, left or right, the ink makes along every strand — maximal runs through points of degree two in the repeat graph over the cyclic band. Junctions and free ends end a strand and are not turns.",
    formula: String.raw`\sum_{s \in \text{strands}} \left|\{\, t \in \tau(s) : t \neq 0 \,\}\right|`,
    key: "totalTurnCount",
    name: "Total Turn Count",
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Counts the nonzero turns across every strand of the repeat. */
  public compute(context: CharacteristicContext): number {
    return this.pathUtilitiesService
      .strands(this.connectivityService.edges(context.matrix, false))
      .reduce(
        (total, strand) =>
          total + this.pathUtilitiesService.signedTurns(strand).length,
        0,
      );
  }
}
