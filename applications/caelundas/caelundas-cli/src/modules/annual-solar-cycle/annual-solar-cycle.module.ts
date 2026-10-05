import { Module } from "@nestjs/common";

import { EphemerisModule } from "../ephemeris/ephemeris.module";
import { MathModule } from "../math/math.module";
import { ProgressiveUtilitiesModule } from "../progressive/progressive-utilities.module";

import { AnnualSolarCycleEventsService } from "./annual-solar-cycle-events.service";
import { AnnualSolarCycleService } from "./annual-solar-cycle.service";

/**
 * NestJS module for annual solar cycle event detection.
 * Exports {@link AnnualSolarCycleService} which identifies solstices, equinoxes,
 * cross-quarter days, hexadecans, and solar apsis (perihelion/aphelion).
 */
@Module({
  controllers: [],
  exports: [AnnualSolarCycleService],
  imports: [EphemerisModule, MathModule, ProgressiveUtilitiesModule],
  providers: [AnnualSolarCycleEventsService, AnnualSolarCycleService],
})
export class AnnualSolarCycleModule {}
