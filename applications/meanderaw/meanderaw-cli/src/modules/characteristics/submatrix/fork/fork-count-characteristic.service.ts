import { Inject, Injectable } from "@nestjs/common";

import { EastForkCountCharacteristicService } from "./east-fork-count-characteristic.service";
import { NorthForkCountCharacteristicService } from "./north-fork-count-characteristic.service";
import { SouthForkCountCharacteristicService } from "./south-fork-count-characteristic.service";
import { WestForkCountCharacteristicService } from "./west-fork-count-characteristic.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts every fork of a Code — points whose ink leaves by exactly three
 * arms — as the sum of the four directional fork characteristics it
 * injects, rather than by scanning the grid itself.
 */
@Injectable()
export class ForkCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(NorthForkCountCharacteristicService)
    private readonly northForkCountService: NorthForkCountCharacteristicService,
    @Inject(SouthForkCountCharacteristicService)
    private readonly southForkCountService: SouthForkCountCharacteristicService,
    @Inject(EastForkCountCharacteristicService)
    private readonly eastForkCountService: EastForkCountCharacteristicService,
    @Inject(WestForkCountCharacteristicService)
    private readonly westForkCountService: WestForkCountCharacteristicService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `forkCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "submatrix",
    description:
      "The number of fork points — ink leaving by exactly three arms — in any of the four orientations.",
    formula: String.raw`n_{\text{N}} + n_{\text{S}} + n_{\text{E}} + n_{\text{W}}`,
    key: "forkCount",
    name: "Fork Count",
    submatrix: { columns: 1, rows: 1 },
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Sums the four directional fork counts over the same context. */
  public compute(context: CharacteristicContext): number {
    return (
      this.northForkCountService.compute(context) +
      this.southForkCountService.compute(context) +
      this.eastForkCountService.compute(context) +
      this.westForkCountService.compute(context)
    );
  }
}
