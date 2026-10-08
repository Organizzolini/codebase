import { Module } from "@nestjs/common";

import { SubmatrixUtilitiesModule } from "../submatrix-utilities.module";

import { HorizontalRectangleCountCharacteristicService } from "./horizontal-rectangle-count-characteristic.service";
import { RectangleUtilitiesService } from "./rectangle-utilities.service";
import { VerticalRectangleCountCharacteristicService } from "./vertical-rectangle-count-characteristic.service";

/**
 * Provides and exports the M×N rectangle characteristic evaluators — rings
 * wider than tall and rings taller than wide — as one group
 * `CharacteristicsModule` imports and re-exports.
 */
@Module({
  controllers: [],
  exports: [
    HorizontalRectangleCountCharacteristicService,
    VerticalRectangleCountCharacteristicService,
  ],
  imports: [SubmatrixUtilitiesModule],
  providers: [
    HorizontalRectangleCountCharacteristicService,
    RectangleUtilitiesService,
    VerticalRectangleCountCharacteristicService,
  ],
})
export class RectangleCharacteristicsModule {}
