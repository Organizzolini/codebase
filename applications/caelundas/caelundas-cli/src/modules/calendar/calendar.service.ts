import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import moment from "moment-timezone";

import { LoggerService } from "@codebase/logging";

import type { DetectedCalendarEvent } from "../caelundas-database/caelundas-database.types";
import type { Environment, Input } from "../input/input.types";
import type {
  BuildCalendarFileContentParameters,
  BuildInstantEventArguments,
} from "./calendar.types";

/**
 * NestJS service responsible for building and writing astronomical event calendars.
 *
 * Converts an array of {@link DetectedCalendarEvent} objects into RFC 5545-compliant iCalendar (ICS) files
 * and persists them to the configured output directory.
 */
@Injectable()
export class CalendarService {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly configService: ConfigService<Environment>,
  ) {
    this.logger.setContext(CalendarService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Builds VEVENT property lines, including the optional location and color. */
  private buildEventProperties(event: DetectedCalendarEvent): string {
    let properties = `SUMMARY:${event.summary}\nDESCRIPTION:${event.description}\nSTATUS:CONFIRMED\nCLASS:PUBLIC\nTRANSP:TRANSPARENT\nCATEGORIES:${event.categories.join(
      ",",
    )}`;
    if (event.location) {
      properties += `\nLOCATION:${event.location}`;
    }
    if (event.color) {
      properties += `\nCOLOR:${event.color}`;
    }
    return properties;
  }

  // 🌎 Public Methods

  /**
   * Generates VTIMEZONE definition for iCalendar timezone support.
   */
  private buildTimezoneContent(timezone: string): string {
    if (timezone === "America/New_York") {
      return `BEGIN:VTIMEZONE
TZID:America/New_York
X-LIC-LOCATION:America/New_York
BEGIN:DAYLIGHT
TZOFFSETFROM:-0500
TZOFFSETTO:-0400
TZNAME:EDT
DTSTART:19700308T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:-0400
TZOFFSETTO:-0500
TZNAME:EST
DTSTART:19701101T020000
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
END:STANDARD
END:VTIMEZONE`;
    }

    // For other timezones, return a basic VTIMEZONE
    // In production, you'd want a more comprehensive timezone database
    return `BEGIN:VTIMEZONE
TZID:${timezone}
END:VTIMEZONE`;
  }

  /** Generates a deterministic event identity string used as the VEVENT UID source. */
  private generateUid(event: DetectedCalendarEvent): string {
    let id = `${event.summary}::${event.description}::${event.start.toISOString()}`;
    if (!event.end.isSame(event.start)) {
      id += `::${event.end.toISOString()}`;
    }
    return id;
  }

  /**
   * Converts a single event to VEVENT format for iCalendar inclusion.
   *
   * Generates an RFC 5545-compliant VEVENT component. UIDs are deterministic based on
   * event content to ensure idempotent imports.
   *
   * @see {@link buildFileContent} for VCALENDAR container generation
   */
  buildEventContent(
    event: DetectedCalendarEvent,
    timezone = "America/New_York",
  ): string {
    const createdAt = moment().format("YYYYMMDDTHHmmss");
    const start = moment.tz(event.start, timezone).format("YYYYMMDDTHHmmss");
    const end = moment.tz(event.end, timezone).format("YYYYMMDDTHHmmss");

    return `BEGIN:VEVENT
UID:${this.generateUid(event)}
DTSTAMP:${createdAt}Z
DTSTART;TZID=${timezone}:${start}
DTEND;TZID=${timezone}:${end}
${this.buildEventProperties(event)}
SEQUENCE:0
LAST-MODIFIED:${createdAt}Z
CREATED:${createdAt}Z
END:VEVENT`;
  }

  /**
   * Generates a complete iCalendar (ICS) file from an array of events.
   *
   * Creates an RFC 5545-compliant VCALENDAR container with VTIMEZONE and VEVENT components.
   *
   *
   * @see {@link buildEventContent} for individual VEVENT generation
   *
   * @example
   * ```typescript
   * const service = new CalendarService();
   * const calendar = service.buildFileContent({
   *   events: [{
   *     start: moment.utc('2026-01-21T14:23:00'),
   *     end: moment.utc('2026-01-21T14:23:00'),
   *     summary: '☽ ☌ ♃ Moon Conjunction Jupiter',
   *     description: 'Exact: 2026-01-21 14:23 EST',
   *     categories: ['aspects', 'major', 'moon'],
   *   }],
   *   name: 'Astronomical Events',
   *   description: 'Caelundas astronomical calendar',
   *   timezone: 'America/New_York',
   * });
   * ```
   */
  buildFileContent(parameters: BuildCalendarFileContentParameters): string {
    const { description, events, name, timezone } = parameters;

    let vcalendar = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Caelundas//Astronomical Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${name}`;

    if (description) {
      vcalendar += `\nX-WR-CALDESC:${description}`;
    }

    if (timezone) {
      vcalendar += `\nX-WR-TIMEZONE:${timezone}\n${this.buildTimezoneContent(timezone)}`;
    }

    vcalendar += `\n${events.map((event) => this.buildEventContent(event, timezone)).join("\n")}
END:VCALENDAR
`;

    return vcalendar;
  }

  /**
   * Builds a one-minute-point event where start and end are the same timestamp.
   */
  buildInstantEvent(args: BuildInstantEventArguments): DetectedCalendarEvent {
    const { categories, date, description, logger, summary, timezone } = args;
    const dateString = date.clone().tz(timezone).toISOString(true);
    logger.info("🗓️ Built a calendar event", undefined, {
      at: dateString,
      summary,
    });

    return {
      categories,
      description,
      end: date,
      start: date,
      summary,
    };
  }

  /**
   * Serializes calendar events to an ICS file and writes it to the output directory.
   *
   * The filename encodes the input date range as `caelundas_<start>_<end>.ics` with
   * `YYYY-MM-DD` dates. The output directory is read from the `OUTPUT_DIRECTORY`
   * environment variable, defaulting to `./output`, and is created when missing.
   *
   */
  async write(events: DetectedCalendarEvent[], input: Input): Promise<void> {
    const calendarFilename = `caelundas_${input.start.format("YYYY-MM-DD")}_${input.end.format("YYYY-MM-DD")}.ics`;
    const calendarFileContent = this.buildFileContent({
      description: "Astronomical events and celestial phenomena",
      events,
      name: "Caelundas 🔭",
      timezone: input.timezone,
    });
    const outputDirectory =
      this.configService.get<string>("OUTPUT_DIRECTORY") ?? "./output";
    const outputPath = path.join(outputDirectory, calendarFilename);
    try {
      await mkdir(outputDirectory, { recursive: true });
      await writeFile(
        outputPath,
        new TextEncoder().encode(calendarFileContent),
      );
    } catch (error) {
      this.logger.error("📝 Failed writing the calendar file", undefined, {
        path: outputPath,
        reason: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
    this.logger.info("✏️ Wrote events to file", undefined, {
      calendarFilename,
      count: events.length,
    });
  }

  /**
   * Serializes calendar events to a JSON file beside the ICS file.
   *
   * The file is named like the ICS file, with a `.json` extension, and holds
   * one object per event with its times in ISO 8601.
   */
  async writeJson(
    events: DetectedCalendarEvent[],
    input: Input,
  ): Promise<void> {
    const timespan = `${input.start.toISOString(true)} to ${input.end.toISOString(true)}`;
    const jsonFilename = `caelundas_${timespan}.json`;
    const outputDirectory =
      this.configService.get<string>("OUTPUT_DIRECTORY") ?? "./output";
    const outputPath = path.join(outputDirectory, jsonFilename);
    const content = JSON.stringify(
      events.map((event) => ({
        categories: event.categories,
        color: event.color ?? null,
        description: event.description,
        end: event.end.toISOString(),
        location: event.location ?? null,
        start: event.start.toISOString(),
        summary: event.summary,
      })),
      undefined,
      2,
    );
    try {
      await writeFile(outputPath, new TextEncoder().encode(content));
    } catch (error) {
      this.logger.error("📝 Failed writing the JSON file", undefined, {
        path: outputPath,
        reason: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
    this.logger.info("✏️ Wrote events to JSON file", undefined, {
      count: events.length,
      jsonFilename,
    });
  }
}
