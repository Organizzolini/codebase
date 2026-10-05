import { Module } from "@nestjs/common";

import { SubmatrixUtilitiesModule } from "../submatrix-utilities.module";

import { CornerCountCharacteristicService } from "./corner-count-characteristic.service";
import { NorthEastCornerCountCharacteristicService } from "./north-east-corner-count-characteristic.service";
import { NorthWestCornerCountCharacteristicService } from "./north-west-corner-count-characteristic.service";
import { SouthEastCornerCountCharacteristicService } from "./south-east-corner-count-characteristic.service";
import { SouthWestCornerCountCharacteristicService } from "./south-west-corner-count-characteristic.service";

/**
 * Provides and exports every 1×1 corner characteristic evaluator — the four
 * orientations and their sum — as one group `CharacteristicsModule` imports
 * and re-exports.
 */
@Module({
  controllers: [],
  exports: [
    CornerCountCharacteristicService,
    NorthEastCornerCountCharacteristicService,
    NorthWestCornerCountCharacteristicService,
    SouthEastCornerCountCharacteristicService,
    SouthWestCornerCountCharacteristicService,
  ],
  imports: [SubmatrixUtilitiesModule],
  providers: [
    CornerCountCharacteristicService,
    NorthEastCornerCountCharacteristicService,
    NorthWestCornerCountCharacteristicService,
    SouthEastCornerCountCharacteristicService,
    SouthWestCornerCountCharacteristicService,
  ],
})
export class CornerCharacteristicsModule {}
