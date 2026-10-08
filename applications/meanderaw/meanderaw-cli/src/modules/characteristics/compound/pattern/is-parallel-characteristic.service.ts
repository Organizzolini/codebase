import { Inject, Injectable } from "@nestjs/common";

import { MaxMonotonicTurnLengthCharacteristicService as MaximumMonotonicTurnLengthCharacteristicService } from "../../path/turn/max-monotonic-turn-length-characteristic.service";
import { DotCountCharacteristicService } from "../../submatrix/point/dot-count-characteristic.service";
import { EdgeCountCharacteristicService } from "../../submatrix/point/edge-count-characteristic.service";
import { CompoundUtilitiesService } from "../compound-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Whether a Code's repeating unit is parallel strokes — junction-free,
 * dot-free ink that never winds past a U-turn: its longest run of
 * same-handed turns is exactly two, so strands nest or stack beside one
 * another instead of coiling.
 */
@Injectable()
export class IsParallelCharacteristicService implements CharacteristicEvaluator<boolean> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(CompoundUtilitiesService)
    private readonly compoundUtilitiesService: CompoundUtilitiesService,
    @Inject(DotCountCharacteristicService)
    private readonly dotCountService: DotCountCharacteristicService,
    @Inject(EdgeCountCharacteristicService)
    private readonly edgeCountService: EdgeCountCharacteristicService,
    @Inject(MaximumMonotonicTurnLengthCharacteristicService)
    private readonly maximumMonotonicTurnLengthService: MaximumMonotonicTurnLengthCharacteristicService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `isParallel` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "compound",
    description:
      "Whether the unit is inked, junction-free, and dot-free, and its longest run of consecutive same-handed turns is exactly two.",
    formula: String.raw`n_{\text{fork}} = n_{\text{cross}} = 0 \wedge n_{\text{dot}} = 0 \wedge |E| > 0 \wedge \mu = 2`,
    key: "isParallel",
    name: "Is Parallel",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Checks the unit is junction-free strokes that turn back at most once in a row. */
  public compute(context: CharacteristicContext): boolean {
    return (
      this.compoundUtilitiesService.isJunctionFree(context) &&
      this.dotCountService.compute(context) === 0 &&
      this.edgeCountService.compute(context) > 0 &&
      this.maximumMonotonicTurnLengthService.compute(context) === 2
    );
  }
}
