import { Module } from "@nestjs/common";

import { LongestHorizontalRunLengthCharacteristicService } from "./longest-horizontal-run-length-characteristic.service";
import { LongestVerticalRunLengthCharacteristicService } from "./longest-vertical-run-length-characteristic.service";
import { RunUtilitiesService } from "./run-utilities.service";

/**
 * Provides and exports every straight-run characteristic evaluator — the
 * longest horizontal and vertical runs of ink over the whole grid — as one
 * group `CharacteristicsModule` imports and re-exports.
 */
@Module({
  controllers: [],
  exports: [
    LongestHorizontalRunLengthCharacteristicService,
    LongestVerticalRunLengthCharacteristicService,
  ],
  imports: [],
  providers: [
    LongestHorizontalRunLengthCharacteristicService,
    LongestVerticalRunLengthCharacteristicService,
    RunUtilitiesService,
  ],
})
export class RunCharacteristicsModule {}
