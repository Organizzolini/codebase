import { Inject, Injectable } from "@nestjs/common";

import { ConnectivityService } from "../../connectivity/connectivity.service";

import { EndUtilitiesService } from "./end-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Whether a Code's exactly two free ends both sit on the band's own border
 * rules — the first or the last row — rather than in its interior. False
 * whenever the repeat closes a loop or branches, since both leave no two
 * free ends to check.
 */
@Injectable()
export class EndsOnBorderRulesCharacteristicService implements CharacteristicEvaluator<boolean> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(ConnectivityService)
    private readonly connectivityService: ConnectivityService,
    @Inject(EndUtilitiesService)
    private readonly endUtilitiesService: EndUtilitiesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `endsOnBorderRules` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "path",
    description:
      "Whether a Code's exactly two free ends both sit on the band's own border rules — the first or the last row.",
    formula: String.raw`\left|V_1\right| = 2 \wedge \forall v \in V_1,\ \text{row}(v) \in \{0,\ \text{rows}-1\}`,
    key: "endsOnBorderRules",
    name: "Ends On Border Rules",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Checks whether the Code's two free ends, if it has exactly two, both sit on the first or last row. */
  public compute(context: CharacteristicContext): boolean {
    const points = this.endUtilitiesService.freeEndPoints(
      this.connectivityService.edges(context.matrix, false),
    );

    return (
      points.length === 2 &&
      points.every((point) => point.row === 0 || point.row === context.rows - 1)
    );
  }
}
