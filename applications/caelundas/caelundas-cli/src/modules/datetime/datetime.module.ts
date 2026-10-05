import { Module } from "@nestjs/common";

import { DatetimeService } from "./datetime.service";

/**
 * NestJS module providing datetime iteration utilities.
 * Exports {@link DatetimeService} for generating minute-by-minute and day-by-day date sequences.
 */
@Module({
  controllers: [],
  exports: [DatetimeService],
  imports: [],
  providers: [DatetimeService],
})
export class DatetimeModule {}
