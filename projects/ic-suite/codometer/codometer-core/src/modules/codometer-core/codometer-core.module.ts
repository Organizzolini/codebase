import { Module } from "@nestjs/common";

import { CodometerCoreService } from "./codometer-core.service";

/**
 * TODO: Document the codometerCore module.
 */
@Module({
  controllers: [],
  exports: [CodometerCoreService],
  imports: [],
  providers: [CodometerCoreService],
})
export class CodometerCoreModule {}
