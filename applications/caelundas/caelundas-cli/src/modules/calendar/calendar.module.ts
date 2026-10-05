import { Module } from "@nestjs/common";

import { CalendarService } from "./calendar.service";

/**
 * NestJS module providing calendar generation utilities.
 * Exports {@link CalendarService} for building iCal calendar data from detected events.
 */
@Module({
  controllers: [],
  exports: [CalendarService],
  imports: [],
  providers: [CalendarService],
})
export class CalendarModule {}
