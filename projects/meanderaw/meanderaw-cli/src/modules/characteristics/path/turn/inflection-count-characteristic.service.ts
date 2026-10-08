import { Inject, Injectable } from "@nestjs/common";

import { ConnectivityService } from "../../connectivity/connectivity.service";
import { PathUtilitiesService } from "../path-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the inflections along one repeat's strands — each point in the
 * sequence of turns, straight steps skipped, where a left turn gives way to
 * a right one or a right to a left. Reversing a strand leaves the count
 * unchanged, so the walk direction does not matter.
 */
@Injectable()
export class InflectionCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(ConnectivityService)
    private readonly connectivityService: ConnectivityService,
    @Inject(PathUtilitiesService)
    private readonly pathUtilitiesService: PathUtilitiesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `inflectionCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "path",
    description:
      "The number of times the ink switches handedness along a strand: consecutive turns, straight steps skipped, where a left turn follows a right turn or a right follows a left. A closed strand also compares its last turn with its first.",
    formula: String.raw`\sum_{s} \left|\{\, i : \sigma_i(s) \neq \sigma_{i+1}(s) \,\}\right|`,
    key: "inflectionCount",
    name: "Inflection Count",
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Counts neighboring turn pairs of opposite hand across every strand. */
  public compute(context: CharacteristicContext): number {
    return this.pathUtilitiesService
      .strands(this.connectivityService.edges(context.matrix, false))
      .reduce(
        (total, strand) =>
          total +
          this.pathUtilitiesService
            .neighborPairs(
              this.pathUtilitiesService.signedTurns(strand),
              strand.closed,
            )
            .filter(([previous, next]) => previous !== next).length,
        0,
      );
  }
}
