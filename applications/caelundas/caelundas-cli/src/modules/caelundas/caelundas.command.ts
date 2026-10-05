import { Inject, Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { CalendarService } from "../calendar/calendar.service";
import { InputService } from "../input/input.service";
import { PerfectiveService } from "../perfective/perfective.service";
import { ProgressiveService } from "../progressive/progressive.service";

/**
 * CLI entry point for caelundas.
 * CLI entry point that orchestrates the full calendar generation pipeline.
 *
 * Reads observer coordinates and date range from environment variables,
 * runs perfective and progressive event detection in sequence, and writes
 * the result to an `.ics` file via {@link CalendarService}.
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
   * across the configured date range, merges and sorts the results by start time, then
   * writes the complete event set to an ICS file via {@link CalendarService}.
   *
   * @returns Promise that resolves when the ICS file has been written.
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

    await this.calendarService.write(allEvents, input);

    this.logger.info("🏁 Completed a caelundas run", undefined, {
      totalEvents: allEvents.length,
    });
  }
}
