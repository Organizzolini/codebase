import { Inject, Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";

import { LoggerService } from "@codebase/logging";

import { CalendarEventsService } from "../calendar-events/calendar-events.service";
import { CalendarService } from "../calendar/calendar.service";
import { InputService } from "../input/input.service";
import { PerfectiveService } from "../perfective/perfective.service";
import { ProgressiveService } from "../progressive/progressive.service";

/**
 * CLI entry point for caelundas.
 * CLI entry point that orchestrates the full calendar generation pipeline.
 *
 * Reads observer coordinates and date range from environment variables,
 * runs perfective and progressive event detection in sequence, upserts the
 * detected events into Postgres, then reads the requested range and location
 * back and writes it to `.ics` and JSON files via {@link CalendarService}.
 */
@Command({
  description: "Run the caelundas command",
  name: "caelundas",
})
@Injectable()
export class CaelundasCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    @Inject(InputService)
    private readonly inputService: InputService,
    @Inject(PerfectiveService)
    private readonly perfectiveEventsService: PerfectiveService,
    @Inject(ProgressiveService)
    private readonly progressiveEventsService: ProgressiveService,
    @Inject(CalendarService)
    private readonly calendarService: CalendarService,
    @Inject(CalendarEventsService)
    private readonly calendarEventsService: CalendarEventsService,
  ) {
    super();
    this.logger.setContext(CaelundasCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Executes the full calendar generation pipeline.
   *
   * Parses environment input, detects all perfective and progressive astronomical events
   * across the configured date range, merges and sorts the results by start time, upserts
   * them through {@link CalendarEventsService}, then renders the stored events for the range and
   * location to ICS and JSON files via {@link CalendarService}.
   *
   * @returns Promise that resolves when both files have been written.
   */
  async run(): Promise<void> {
    this.logger.debug("🚀 Starting a caelundas run", undefined, {
      arguments: process.argv.slice(2),
    });

    const input = this.inputService.parse();

    const perfectiveEvents = this.perfectiveEventsService.detect(input);
    this.logger.info("🔎 Detected perfective events", undefined, {
      count: perfectiveEvents.length,
    });

    const progressiveEvents =
      this.progressiveEventsService.detect(perfectiveEvents);
    this.logger.info("🔎 Detected progressive events", undefined, {
      count: progressiveEvents.length,
    });

    const allEvents = [...perfectiveEvents, ...progressiveEvents].toSorted(
      (a, b) => a.start.valueOf() - b.start.valueOf(),
    );

    const coordinates = {
      latitude: input.latitude,
      longitude: input.longitude,
    };
    await this.calendarEventsService.upsert(allEvents, coordinates);

    const storedEvents = await this.calendarEventsService.findInRange({
      ...coordinates,
      // Detection covers the whole end date, so read back through its end.
      end: input.end.clone().add(1, "day"),
      start: input.start,
    });

    await this.calendarService.write(storedEvents, input);
    await this.calendarService.writeJson(storedEvents, input);

    this.logger.info("🏁 Completed a caelundas run", undefined, {
      detectedEvents: allEvents.length,
      totalEvents: storedEvents.length,
    });
  }
}
