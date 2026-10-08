import { Module } from "@nestjs/common";

import { CalendarModule } from "../calendar/calendar.module";
import { EphemerisModule } from "../ephemeris/ephemeris.module";

import { LunarApsidesService } from "./lunar-apsides.service";
import { MonthlyLunarCycleService } from "./monthly-lunar-cycle.service";

/**
 * NestJS module for monthly lunar cycle event detection.
 * Exports {@link MonthlyLunarCycleService} which identifies the four primary lunar phases,
 * and {@link LunarApsidesService} which identifies lunar apogee and perigee.
 */
@Module({
  controllers: [],
  exports: [LunarApsidesService, MonthlyLunarCycleService],
  imports: [CalendarModule, EphemerisModule],
  providers: [LunarApsidesService, MonthlyLunarCycleService],
})
export class MonthlyLunarCycleModule {}
