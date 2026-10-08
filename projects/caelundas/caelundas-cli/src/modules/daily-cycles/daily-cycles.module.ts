import { Module } from "@nestjs/common";

import { CalendarModule } from "../calendar/calendar.module";
import { EphemerisModule } from "../ephemeris/ephemeris.module";
import { MathModule } from "../math/math.module";

import { DailyCyclesBuilderService } from "./daily-cycles-builder.service";
import { DailyCyclesService } from "./daily-cycles.service";

/**
 * NestJS module for daily solar and lunar cycle event detection.
 * Exports {@link DailyCyclesService} which identifies sunrise, solar noon, sunset,
 * solar midnight, moonrise, lunar noon, moonset, and lunar midnight events.
 */
@Module({
  controllers: [],
  exports: [DailyCyclesService],
  imports: [CalendarModule, EphemerisModule, MathModule],
  providers: [DailyCyclesBuilderService, DailyCyclesService],
})
export class DailyCyclesModule {}
