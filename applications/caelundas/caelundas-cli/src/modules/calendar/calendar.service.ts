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

  /** Builds one STANDARD or DAYLIGHT observance of a VTIMEZONE. */
  private buildObservance(parameters: {
    abbreviation: string;
    from: number;
    localStart: moment.Moment;
    to: number;
  }): string {
    const { abbreviation, from, localStart, to } = parameters;
    const kind = to > from ? "DAYLIGHT" : "STANDARD";
    return `BEGIN:${kind}
TZOFFSETFROM:${this.formatOffset(from)}
TZOFFSETTO:${this.formatOffset(to)}
TZNAME:${abbreviation}
DTSTART:${localStart.format("YYYYMMDDTHHmmss")}
END:${kind}`;
  }

  /**
   * Generates a VTIMEZONE definition from the IANA rules in moment-timezone.
   *
   * Emits an initial observance for the offset in force at the start of the
   * covered years, followed by one explicit observance per transition within
   * them, so every zone gets valid STANDARD and DAYLIGHT components.
   */
  private buildTimezoneContent(
    timezone: string,
    events: DetectedCalendarEvent[],
  ): string {
    const zone = moment.tz.zone(timezone);
    if (!zone) {
      throw new Error(`Unknown IANA timezone: ${timezone}`);
    }
    const instants = events.flatMap((event) => [event.start, event.end]);
    const bounds = instants.length > 0 ? instants : [moment.utc()];
    const window = {
      end: moment.max(bounds).clone().utc().add(1, "year").valueOf(),
      start: moment.min(bounds).clone().utc().subtract(1, "year").valueOf(),
    };
    const initialOffset = -zone.utcOffset(window.start);
    const observances = [
      this.buildObservance({
        abbreviation: zone.abbr(window.start),
        from: initialOffset,
        localStart: moment.utc("1970-01-01T00:00:00"),
        to: initialOffset,
      }),
      ...this.findTransitions(zone, window).map((transition) => {
        const from = -zone.utcOffset(transition - 1);
        return this.buildObservance({
          abbreviation: zone.abbr(transition),
          from,
          localStart: moment.utc(transition).add(from, "minutes"),
          to: -zone.utcOffset(transition),
        });
      }),
    ];

    return `BEGIN:VTIMEZONE
TZID:${timezone}
X-LIC-LOCATION:${timezone}
${observances.join("\n")}
END:VTIMEZONE`;
  }

  /** Returns the transition instants of a zone within a window, in ascending order. */
  private findTransitions(
    zone: moment.MomentZone,
    window: { end: number; start: number },
  ): number[] {
    return zone.untils.filter(
      (until) =>
        Number.isFinite(until) && until > window.start && until <= window.end,
    );
  }

  /**
   * Formats an event instant for DTSTART or DTEND.
   *
   * Uses the zone's local time with a TZID, except in the repeated fall-back
   * hour, where one local time names two instants and a UTC instant keeps the
   * true one.
   */
  private formatEventTime(
    name: "DTEND" | "DTSTART",
    instant: moment.Moment,
    timezone: string,
  ): string {
    const pattern = "YYYYMMDDTHHmmss";
    const local = moment.tz(instant, timezone).format(pattern);
    const repeated = [-120, -60, -30, 30, 60, 120].some(
      (minutes) =>
        moment
          .tz(instant.clone().add(minutes, "minutes"), timezone)
          .format(pattern) === local,
    );
    if (!repeated) {
      return `${name};TZID=${timezone}:${local}`;
    }
    return `${name}:${instant.clone().utc().format(pattern)}Z`;
  }

  /** Formats a UTC offset given in minutes east of UTC as `+HHMM` or `-HHMM`. */
  private formatOffset(minutesEast: number): string {
    const sign = minutesEast < 0 ? "-" : "+";
    const absolute = Math.abs(minutesEast);
    const hours = String(Math.trunc(absolute / 60)).padStart(2, "0");
    const minutes = String(absolute % 60).padStart(2, "0");
    return `${sign}${hours}${minutes}`;
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

    return `BEGIN:VEVENT
UID:${this.generateUid(event)}
DTSTAMP:${createdAt}Z
${this.formatEventTime("DTSTART", event.start, timezone)}
${this.formatEventTime("DTEND", event.end, timezone)}
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
      vcalendar += `\nX-WR-TIMEZONE:${timezone}\n${this.buildTimezoneContent(timezone, events)}`;
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
