import { Inject, Injectable } from "@nestjs/common";

import { ConnectivityService } from "../../connectivity/connectivity.service";
import { PathUtilitiesService } from "../path-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts how many times one repeat's ink touches the top border: the
 * separate runs of inked points along the first row, which sits against the
 * band's top border rule. A row inked all the way around the band is one
 * touch.
 */
@Injectable()
export class TopBorderTouchCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(ConnectivityService)
    private readonly connectivityService: ConnectivityService,
    @Inject(PathUtilitiesService)
    private readonly pathUtilitiesService: PathUtilitiesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `topBorderTouchCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "path",
    description:
      "The number of separate runs of ink on the first row, the row against the band's top border rule: inked points grouped by the edges joining them along that row, wrapping across the tile boundary.",
    formula: String.raw`\left|\text{runs}(\text{row}_0)\right|`,
    key: "topBorderTouchCount",
    name: "Top Border Touch Count",
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Counts the separate runs of ink on the first row. */
  public compute(context: CharacteristicContext): number {
    return this.pathUtilitiesService.rowTouchCount(
      this.connectivityService.edges(context.matrix, false),
      0,
    );
  }
}
