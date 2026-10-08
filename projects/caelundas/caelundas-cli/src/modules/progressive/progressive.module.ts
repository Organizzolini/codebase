import { Module } from "@nestjs/common";

import { AnnualSolarCycleModule } from "../annual-solar-cycle/annual-solar-cycle.module";
import { AspectsModule } from "../aspects/aspects.module";
import { EclipsesModule } from "../eclipses/eclipses.module";
import { IngressesModule } from "../ingresses/ingresses.module";
import { MonthlyLunarCycleModule } from "../monthly-lunar-cycle/monthly-lunar-cycle.module";
import { PhasesModule } from "../phases/phases.module";
import { RetrogradesModule } from "../retrogrades/retrogrades.module";
import { TwilightsModule } from "../twilights/twilights.module";

import { ProgressiveService } from "./progressive.service";

/**
 * NestJS module orchestrating progressive (span) event detection.
 * Imports all event sub-modules and exposes {@link ProgressiveService} which converts
 * instantaneous events into time-spanning progressive events.
 */
@Module({
  controllers: [],
  exports: [ProgressiveService],
  imports: [
    AnnualSolarCycleModule,
    AspectsModule,
    EclipsesModule,
    IngressesModule,
    MonthlyLunarCycleModule,
    PhasesModule,
    RetrogradesModule,
    TwilightsModule,
  ],
  providers: [ProgressiveService],
})
export class ProgressiveModule {}
