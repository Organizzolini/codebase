import { Module } from "@nestjs/common";

import { AnnualSolarCycleModule } from "../annual-solar-cycle/annual-solar-cycle.module";
import { AspectsModule } from "../aspects/aspects.module";
import { DailyCyclesModule } from "../daily-cycles/daily-cycles.module";
import { DatetimeModule } from "../datetime/datetime.module";
import { EclipsesModule } from "../eclipses/eclipses.module";
import { EphemerisModule } from "../ephemeris/ephemeris.module";
import { IngressesModule } from "../ingresses/ingresses.module";
import { MonthlyLunarCycleModule } from "../monthly-lunar-cycle/monthly-lunar-cycle.module";
import { PhasesModule } from "../phases/phases.module";
import { RetrogradesModule } from "../retrogrades/retrogrades.module";
import { TwilightsModule } from "../twilights/twilights.module";

import { PerfectiveService } from "./perfective.service";

/**
 * NestJS module orchestrating per-minute astronomical event detection.
 * Imports all event sub-modules and exposes {@link PerfectiveService} which iterates
 * minute-by-minute over a date range to detect all perfective (instantaneous) events.
 */
@Module({
  controllers: [],
  exports: [PerfectiveService],
  imports: [
    DatetimeModule,
    EphemerisModule,
    AspectsModule,
    EclipsesModule,
    RetrogradesModule,
    IngressesModule,
    DailyCyclesModule,
    MonthlyLunarCycleModule,
    AnnualSolarCycleModule,
    TwilightsModule,
    PhasesModule,
  ],
  providers: [PerfectiveService],
})
export class PerfectiveModule {}
