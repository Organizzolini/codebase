import { Module } from "@nestjs/common";

import { CalendarModule } from "../calendar/calendar.module";
import { EphemerisModule } from "../ephemeris/ephemeris.module";

import { MonthlyLunarCycleService } from "./monthly-lunar-cycle.service";

/**
 * NestJS module for monthly lunar cycle event detection.
 * Exports {@link MonthlyLunarCycleService} which identifies the four primary lunar phases.
 */
@Module({
  controllers: [],
  exports: [MonthlyLunarCycleService],
  imports: [CalendarModule, EphemerisModule],
  providers: [MonthlyLunarCycleService],
})
export class MonthlyLunarCycleModule {}
