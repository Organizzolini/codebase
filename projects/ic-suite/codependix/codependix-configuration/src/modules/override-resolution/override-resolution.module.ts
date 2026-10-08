import { Module } from "@nestjs/common";

import { OverrideResolutionService } from "./override-resolution.service";

/**
 * NestJS module that wires strict, per-field CLI override resolution.
 */
@Module({
  controllers: [],
  exports: [OverrideResolutionService],
  imports: [],
  providers: [OverrideResolutionService],
})
export class OverrideResolutionModule {}
