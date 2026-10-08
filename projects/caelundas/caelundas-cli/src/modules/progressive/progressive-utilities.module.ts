import { Module } from "@nestjs/common";

import { ProgressiveAspectService } from "./progressive-aspect.service";
import { ProgressiveUtilitiesService } from "./progressive-utilities.service";

/**
 * NestJS module providing utilities for progressive event construction.
 * Exports {@link ProgressiveUtilitiesService} for pairing start/end events into duration spans.
 */
@Module({
  controllers: [],
  exports: [ProgressiveAspectService, ProgressiveUtilitiesService],
  imports: [],
  providers: [ProgressiveAspectService, ProgressiveUtilitiesService],
})
export class ProgressiveUtilitiesModule {}
