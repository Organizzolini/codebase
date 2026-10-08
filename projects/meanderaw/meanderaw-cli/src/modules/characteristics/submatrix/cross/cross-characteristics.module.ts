import { Module } from "@nestjs/common";

import { SubmatrixUtilitiesModule } from "../submatrix-utilities.module";

import { CrossCountCharacteristicService } from "./cross-count-characteristic.service";

/**
 * Provides and exports the 1×1 cross characteristic evaluator as one group
 * `CharacteristicsModule` imports and re-exports.
 */
@Module({
  controllers: [],
  exports: [CrossCountCharacteristicService],
  imports: [SubmatrixUtilitiesModule],
  providers: [CrossCountCharacteristicService],
})
export class CrossCharacteristicsModule {}
