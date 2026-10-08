import { Inject, Injectable } from "@nestjs/common";

import { DoubleHorizontalEdgeCountCharacteristicService } from "../../submatrix/point/double-horizontal-edge-count-characteristic.service";
import { IsClosedLoopCharacteristicService } from "../structure/is-closed-loop-characteristic.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Whether a Code's repeating unit is a snake — one closed loop that runs
 * straight east and west through at least `columns - 1` points.
 */
@Injectable()
export class IsSnakeCharacteristicService implements CharacteristicEvaluator<boolean> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(DoubleHorizontalEdgeCountCharacteristicService)
    private readonly doubleHorizontalEdgeCountService: DoubleHorizontalEdgeCountCharacteristicService,
    @Inject(IsClosedLoopCharacteristicService)
    private readonly isClosedLoopService: IsClosedLoopCharacteristicService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `isSnake` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "compound",
    description:
      "Whether the unit is a single closed loop with at least columns - 1 straight horizontal points.",
    formula: String.raw`\text{isClosedLoop} \wedge n_{EW} \geq p - 1`,
    key: "isSnake",
    name: "Is Snake",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Checks the unit is one loop stretched along the band. */
  public compute(context: CharacteristicContext): boolean {
    return (
      this.isClosedLoopService.compute(context) &&
      this.doubleHorizontalEdgeCountService.compute(context) >=
        context.columns - 1
    );
  }
}
