import { Module } from "@nestjs/common";

import { SubmatrixUtilitiesModule } from "../submatrix-utilities.module";

import { EastForkCountCharacteristicService } from "./east-fork-count-characteristic.service";
import { ForkCountCharacteristicService } from "./fork-count-characteristic.service";
import { NorthForkCountCharacteristicService } from "./north-fork-count-characteristic.service";
import { SouthForkCountCharacteristicService } from "./south-fork-count-characteristic.service";
import { WestForkCountCharacteristicService } from "./west-fork-count-characteristic.service";

/**
 * Provides and exports every 1×1 fork characteristic evaluator — the four
 * orientations, named by stem, and their sum — as one group
 * `CharacteristicsModule` imports and re-exports.
 */
@Module({
  controllers: [],
  exports: [
    EastForkCountCharacteristicService,
    ForkCountCharacteristicService,
    NorthForkCountCharacteristicService,
    SouthForkCountCharacteristicService,
    WestForkCountCharacteristicService,
  ],
  imports: [SubmatrixUtilitiesModule],
  providers: [
    EastForkCountCharacteristicService,
    ForkCountCharacteristicService,
    NorthForkCountCharacteristicService,
    SouthForkCountCharacteristicService,
    WestForkCountCharacteristicService,
  ],
})
export class ForkCharacteristicsModule {}
