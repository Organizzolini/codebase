import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import { CalendarService } from "../calendar/calendar.service";

import {
  LUNAR_APOGEE_CATEGORY,
  LUNAR_APSIDES_BASE_CATEGORIES,
  LUNAR_PERIGEE_CATEGORY,
} from "./monthly-lunar-cycle.constants";

import type { DetectedCalendarEvent } from "../caelundas-database/caelundas-database.types";
import type { DistanceEphemeris } from "../ephemeris/ephemeris.types";
import type { Moment } from "moment-timezone";

/**
 * Detects lunar apogee and perigee from extrema of the Moon's geocentric distance.
 *
 * These are events of the Moon's orbit, distinct from the "Lunar Apogee" body
 * (the osculating apogee point) that aspects are measured against.
 */
@Injectable()
export class LunarApsidesService {
  // 🏗 Dependency Injection

  constructor(
    private readonly calendarService: CalendarService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(LunarApsidesService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Builds an instant apsis event. */
  private buildApsisEvent(args: {
    category: string;
    date: Moment;
    description: string;
    summary: string;
  }): DetectedCalendarEvent {
    const { category, date, description, summary } = args;
    return this.calendarService.buildInstantEvent({
      categories: [...LUNAR_APSIDES_BASE_CATEGORIES, category],
      date,
      description,
      logger: this.logger,
      summary,
      timezone: "America/New_York",
    });
  }

  /** Reads the Moon's radial speed at an offset from the minute. */
  private getRadialSpeed(
    minute: Moment,
    moonDistanceEphemeris: DistanceEphemeris,
    offsetMinutes: number,
  ): number {
    const timestamp = minute
      .clone()
      .add(offsetMinutes, "minutes")
      .toISOString();
    const data = moonDistanceEphemeris[timestamp];
    if (data?.distanceSpeed === undefined) {
      throw new Error(`Missing distanceSpeed at ${timestamp}`);
    }
    return data.distanceSpeed;
  }

  /** Whether this minute is the nearest to a zero crossing of the given kind. */
  private isApsis(
    direction: "apogee" | "perigee",
    speeds: { current: number; next: number; previous: number },
  ): boolean {
    const { current, next, previous } = speeds;
    return (
      this.isCrossingAt({
        direction,
        earlier: current,
        later: next,
        stampsEarlier: true,
      }) ||
      this.isCrossingAt({
        direction,
        earlier: previous,
        later: current,
        stampsEarlier: false,
      })
    );
  }

  /**
   * Whether the radial speed crosses zero in the given direction between the
   * minute and its neighbor, and the minute is the nearer of the two to zero.
   *
   * @remarks
   * - Perigee: speed goes from negative to non-negative (approach to recession).
   * - Apogee: speed goes from positive to non-positive.
   * - The earlier minute wins a tie, so each crossing is stamped exactly once.
   * - Radial speed is smooth where the distance itself can step at ephemeris
   *   segment boundaries, so it is the extremum test.
   */
  private isCrossingAt(args: {
    direction: "apogee" | "perigee";
    earlier: number;
    later: number;
    stampsEarlier: boolean;
  }): boolean {
    const { direction, earlier, later, stampsEarlier } = args;
    const crosses =
      direction === "perigee"
        ? earlier < 0 && later >= 0
        : earlier > 0 && later <= 0;
    if (!crosses) {
      return false;
    }
    const earlierIsNearer = Math.abs(earlier) <= Math.abs(later);
    return stampsEarlier ? earlierIsNearer : !earlierIsNearer;
  }

  // 🌎 Public Methods

  /**
   * Detects a lunar apogee or perigee at one minute.
   *
   * @remarks
   * - Perigee is the nearest point of the Moon's orbit, apogee the farthest.
   * - Found where the Moon's radial speed changes sign, stamped at the adjacent
   *   minute whose speed is nearer zero.
   */
  detect(args: {
    minute: Moment;
    moonDistanceEphemeris: DistanceEphemeris;
  }): DetectedCalendarEvent[] {
    const { minute, moonDistanceEphemeris } = args;
    const speeds = {
      current: this.getRadialSpeed(minute, moonDistanceEphemeris, 0),
      next: this.getRadialSpeed(minute, moonDistanceEphemeris, 1),
      previous: this.getRadialSpeed(minute, moonDistanceEphemeris, -1),
    };
    const events: DetectedCalendarEvent[] = [];
    if (this.isApsis("apogee", speeds)) {
      events.push(
        this.buildApsisEvent({
          category: LUNAR_APOGEE_CATEGORY,
          date: minute,
          description: "Lunar Apogee (Moon farthest from Earth)",
          summary: "🌙 ❄️ Lunar Apogee",
        }),
      );
    }
    if (this.isApsis("perigee", speeds)) {
      events.push(
        this.buildApsisEvent({
          category: LUNAR_PERIGEE_CATEGORY,
          date: minute,
          description: "Lunar Perigee (Moon nearest to Earth)",
          summary: "🌙 🔥 Lunar Perigee",
        }),
      );
    }
    return events;
  }
}
