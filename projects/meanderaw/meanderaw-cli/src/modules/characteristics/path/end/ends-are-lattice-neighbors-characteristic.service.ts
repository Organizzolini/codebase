import { Inject, Injectable } from "@nestjs/common";

import { ConnectivityService } from "../../connectivity/connectivity.service";

import { EndUtilitiesService } from "./end-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Whether a Code's exactly two free ends sit one lattice step apart —
 * counting the shorter way around the cyclic band for their column
 * distance — rather than anywhere further across the grid. False whenever
 * the repeat closes a loop or branches, since both leave no two free ends to
 * compare.
 */
@Injectable()
export class EndsAreLatticeNeighborsCharacteristicService implements CharacteristicEvaluator<boolean> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(ConnectivityService)
    private readonly connectivityService: ConnectivityService,
    @Inject(EndUtilitiesService)
    private readonly endUtilitiesService: EndUtilitiesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `endsAreLatticeNeighbors` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "path",
    description:
      "Whether a Code's exactly two free ends sit one lattice step apart, the column distance taken the shorter way around the cyclic band.",
    formula: String.raw`\left|V_1\right| = 2 \wedge \min(|c_1 - c_2|,\ \text{columns} - |c_1 - c_2|) + |r_1 - r_2| = 1`,
    key: "endsAreLatticeNeighbors",
    name: "Ends Are Lattice Neighbors",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Checks whether the Code's two free ends, if it has exactly two, are one lattice step apart. */
  public compute(context: CharacteristicContext): boolean {
    const points = this.endUtilitiesService.freeEndPoints(
      this.connectivityService.edges(context.matrix, false),
    );
    if (points.length !== 2) {
      return false;
    }

    const [first, second] = points;
    if (!first || !second) {
      return false;
    }

    const columnDistance = Math.abs(first.column - second.column);
    const minimumColumnDistance = Math.min(
      columnDistance,
      context.columns - columnDistance,
    );
    const rowDistance = Math.abs(first.row - second.row);

    return minimumColumnDistance + rowDistance === 1;
  }
}
