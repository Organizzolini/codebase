import { Inject, Injectable } from "@nestjs/common";

import { IsClosedLoopCharacteristicService } from "../structure/is-closed-loop-characteristic.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Whether a Code's repeating unit is a snake — one closed, junction-free
 * loop, one column narrower than it is deep. The pitch is the unit's own
 * column count.
 */
@Injectable()
export class IsSnakeCharacteristicService implements CharacteristicEvaluator<boolean> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(IsClosedLoopCharacteristicService)
    private readonly isClosedLoopService: IsClosedLoopCharacteristicService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `isSnake` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "compound",
    description:
      "Whether the repeating unit is one junction-free closed loop at pitch rows - 1.",
    formula: String.raw`\text{isClosedLoop} \wedge p = r - 1`,
    key: "isSnake",
    name: "Is Snake",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Checks the unit is one closed loop at pitch `rows - 1`. */
  public compute(context: CharacteristicContext): boolean {
    return (
      this.isClosedLoopService.compute(context) &&
      context.columns === context.rows - 1
    );
  }
}
