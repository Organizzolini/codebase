import { Module } from "@nestjs/common";

import { CrossCharacteristicsModule } from "../submatrix/cross/cross-characteristics.module";
import { ForkCharacteristicsModule } from "../submatrix/fork/fork-characteristics.module";

import { CompoundUtilitiesService } from "./compound-utilities.service";

/**
 * Provides and exports the one stateless `CompoundUtilitiesService` every
 * compound group reads junction-free ink through, so the structure and
 * pattern groups import a single shared instance rather than each providing
 * its own. It imports the fork and cross groups whose evaluators that
 * service reads.
 */
@Module({
  controllers: [],
  exports: [CompoundUtilitiesService],
  imports: [CrossCharacteristicsModule, ForkCharacteristicsModule],
  providers: [CompoundUtilitiesService],
})
export class CompoundUtilitiesModule {}
