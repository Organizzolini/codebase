import { Module } from "@nestjs/common";

import { EphemerisModule } from "../ephemeris/ephemeris.module";
import { MathModule } from "../math/math.module";
import { ProgressiveUtilitiesModule } from "../progressive/progressive-utilities.module";

import { RetrogradesService } from "./retrogrades.service";

/**
 * NestJS module for planetary retrograde event detection.
 * Exports {@link RetrogradesService} which identifies when planets reverse apparent direction.
 */
@Module({
  controllers: [],
  exports: [RetrogradesService],
  imports: [EphemerisModule, MathModule, ProgressiveUtilitiesModule],
  providers: [RetrogradesService],
})
export class RetrogradesModule {}
