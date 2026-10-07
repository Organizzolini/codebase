import { Inject, Injectable } from "@nestjs/common";

import { MaxMonotonicTurnLengthCharacteristicService as MaximumMonotonicTurnLengthCharacteristicService } from "../../path/turn/max-monotonic-turn-length-characteristic.service";
import { IsSingleArcCharacteristicService } from "../structure/is-single-arc-characteristic.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Whether a Code's repeating unit is a waterfall — a single open arc that
 * never turns the same way twice in a row, so it steps down in a
 * staircase rather than winding.
 */
@Injectable()
export class IsWaterfallsCharacteristicService implements CharacteristicEvaluator<boolean> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(IsSingleArcCharacteristicService)
    private readonly isSingleArcService: IsSingleArcCharacteristicService,
    @Inject(MaximumMonotonicTurnLengthCharacteristicService)
    private readonly maximumMonotonicTurnLengthService: MaximumMonotonicTurnLengthCharacteristicService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `isWaterfalls` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "compound",
    description:
      "Whether the unit is a single open arc whose longest run of consecutive same-handed turns is one.",
    formula: String.raw`\text{isSingleArc} \wedge \mu = 1`,
    key: "isWaterfalls",
    name: "Is Waterfalls",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Checks the unit is one arc that alternates every turn. */
  public compute(context: CharacteristicContext): boolean {
    return (
      this.isSingleArcService.compute(context) &&
      this.maximumMonotonicTurnLengthService.compute(context) === 1
    );
  }
}
