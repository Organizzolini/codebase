import { Inject, Injectable } from "@nestjs/common";

import { ConnectivityService } from "../../connectivity/connectivity.service";
import { PathUtilitiesService } from "../path-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the hairpin U-turns of one repeat at their tightest: two points
 * joined by a single edge that both turn the same way, so the ink comes back
 * the way it went one grid unit over. A wider U, with a straight step
 * between its two turns, is not counted.
 */
@Injectable()
export class TightestTurnCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(ConnectivityService)
    private readonly connectivityService: ConnectivityService,
    @Inject(PathUtilitiesService)
    private readonly pathUtilitiesService: PathUtilitiesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `tightestTurnCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "path",
    description:
      "The number of hairpin U-turns at the tightest possible width: two turns of the same hand at the two ends of a single edge, which reverses the ink's heading across one grid unit. A unit square loop holds four.",
    formula: String.raw`\sum_{s} \left|\{\, i : \tau_i(s) = \tau_{i+1}(s) \neq 0 \,\}\right|`,
    key: "tightestTurnCount",
    name: "Tightest Turn Count",
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Counts neighboring points that both turn the same way across every strand. */
  public compute(context: CharacteristicContext): number {
    return this.pathUtilitiesService
      .strands(this.connectivityService.edges(context.matrix, false))
      .reduce(
        (total, strand) =>
          total +
          this.pathUtilitiesService
            .neighborPairs(strand.turns, strand.closed)
            .filter(([previous, next]) => previous !== 0 && previous === next)
            .length,
        0,
      );
  }
}
