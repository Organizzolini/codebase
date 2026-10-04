import { Inject, Injectable } from "@nestjs/common";

import { ConnectivityService } from "../../connectivity/connectivity.service";
import { PathUtilitiesService } from "../path-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Measures how far one repeat's ink winds in one direction: the longest run
 * of consecutive turns of the same hand along any strand, straight steps
 * skipped and wrapping around a closed strand. Zero when the ink never turns.
 */
@Injectable()
export class MaxMonotonicTurnLengthCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(ConnectivityService)
    private readonly connectivityService: ConnectivityService,
    @Inject(PathUtilitiesService)
    private readonly pathUtilitiesService: PathUtilitiesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `maxMonotonicTurnLength` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "path",
    description:
      "The length of the longest run of consecutive same-handed turns along any strand, straight steps skipped — how far the ink winds one way before it turns the other. A closed strand that only ever turns one way scores all of its turns.",
    formula: String.raw`\max_{s} \max \left\{\, k : \sigma_i(s) = \dots = \sigma_{i+k-1}(s) \,\right\}`,
    key: "maxMonotonicTurnLength",
    name: "Max Monotonic Turn Length",
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Finds the longest same-handed run of turns over every strand. */
  public compute(context: CharacteristicContext): number {
    return Math.max(
      0,
      ...this.pathUtilitiesService
        .strands(this.connectivityService.edges(context.matrix, false))
        .map((strand) =>
          this.pathUtilitiesService.longestRun(
            this.pathUtilitiesService.signedTurns(strand),
            strand.closed,
          ),
        ),
    );
  }
}
