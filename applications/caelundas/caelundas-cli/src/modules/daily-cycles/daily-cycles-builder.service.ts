import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import { CalendarService } from "../calendar/calendar.service";
import { EphemerisService } from "../ephemeris/ephemeris.service";
import { MathService } from "../math/math.service";

import type { DetectedCalendarEvent } from "../caelundas-database/caelundas-database.types";
import type {
  AzimuthElevationEphemeris,
  AzimuthElevationEphemerisBody,
} from "../ephemeris/ephemeris.types";
import type { Moment } from "moment-timezone";

/** Event building and elevation detection helpers for {@link DailyCyclesService}. */
@Injectable()
export class DailyCyclesBuilderService {
  // 🏗 Dependency Injection

  constructor(
    private readonly calendarService: CalendarService,
    private readonly logger: LoggerService,
    private readonly ephemerisService: EphemerisService,
  ) {
    this.logger.setContext(DailyCyclesBuilderService.name);
  }

  // 🔐 Private Fields

  /** Standard atmospheric refraction at the horizon, 34′, as the US Naval Observatory uses. */
  private static readonly horizonRefractionDegrees =
    34 / MathService.arcminutesPerDegree;
  private static readonly lunarCategories = [
    "Astronomy",
    "Astrology",
    "Daily Lunar Cycle",
    "Lunar",
  ];
  private static readonly solarCategories = [
    "Astronomy",
    "Astrology",
    "Daily Solar Cycle",
    "Solar",
  ];
  /**
   * The Sun's conventional semidiameter, 16′. With refraction it gives the
   * standard sunrise and sunset altitude of −0.8333°.
   */
  private static readonly sunSemidiameterDegrees =
    16 / MathService.arcminutesPerDegree;

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Whether an upward zero crossing of `previous → current → next` rounds to
   * the current minute: a crossing between the previous minute and this one
   * belongs here when it falls in its second half, and one between this
   * minute and the next when it falls in its first half. Each crossing
   * therefore lands on exactly one minute, the nearest one.
   */
  private static crossesUpwardNearCurrent(args: {
    current: number;
    next: number;
    previous: number;
  }): boolean {
    const { current, next, previous } = args;
    if (previous < 0 && current >= 0) {
      return previous / (previous - current) >= 0.5;
    }
    if (current < 0 && next >= 0) {
      return current / (current - next) < 0.5;
    }
    return false;
  }

  // 🌎 Public Methods

  /**
   * Creates a lunar nadir calendar event.
   *
   * Lunar nadir is the moment when the Moon reaches its lowest point below
   * the horizon (anti-culmination). This is when the Moon is on the opposite
   * side of the celestial sphere from zenith.
   *
   * @param date - Precise UTC time of lunar nadir.
   * @returns Calendar event for lunar nadir with emoji summary.
   * @see {@link isMinimum} for minimum detection algorithm
   *
   * @example
   * ```typescript
   * const event = getLunarNadirEvent(new Date('2025-01-21T06:30:00Z'));
   * // event.summary === '🌙 ⏬ Lunar Nadir'
   * ```
   */
  buildLunarNadirEvent(date: Moment): DetectedCalendarEvent {
    const description = "Lunar Nadir";
    const summary = `🌙 ⏬ ${description}`;

    return this.calendarService.buildInstantEvent({
      categories: DailyCyclesBuilderService.lunarCategories,
      date,
      description,
      logger: this.logger,
      summary,
      timezone: "America/New_York",
    });
  }

  /**
   * Creates a lunar zenith (culmination) calendar event.
   *
   * Lunar zenith is the moment when the Moon reaches its highest elevation
   * above the horizon (transit of the local meridian). This is when the Moon
   * appears most prominent in the sky from the observer's location.
   *
   * @param date - Precise UTC time of lunar zenith.
   * @returns Calendar event for lunar zenith with emoji summary.
   * @see {@link isMaximum} for maximum detection algorithm
   *
   * @example
   * ```typescript
   * const event = getLunarZenithEvent(new Date('2025-01-21T18:45:00Z'));
   * // event.summary === '🌙 ⏫ Lunar Zenith'
   * ```
   */
  buildLunarZenithEvent(date: Moment): DetectedCalendarEvent {
    const description = "Lunar Zenith";
    const summary = `🌙 ⏫ ${description}`;

    return this.calendarService.buildInstantEvent({
      categories: DailyCyclesBuilderService.lunarCategories,
      date,
      description,
      logger: this.logger,
      summary,
      timezone: "America/New_York",
    });
  }

  /**
   * Creates a moonrise calendar event.
   *
   * Moonrise occurs when the Moon crosses the horizon from below, becoming
   * visible. The timing accounts for the Moon's apparent radius (~16 arcminutes)
   * to mark the moment the upper limb appears above the horizon.
   *
   * @param date - Precise UTC time of moonrise.
   * @returns Calendar event for moonrise with emoji summary.
   * @see {@link isRise} for rise detection criteria
   *
   * @example
   * ```typescript
   * const event = getMoonriseEvent(new Date('2025-01-21T12:30:00Z'));
   * // event.summary === '🌙 🔼 Moonrise'
   * ```
   */
  buildMoonriseEvent(date: Moment): DetectedCalendarEvent {
    const description = "Moonrise";
    const summary = `🌙 🔼 ${description}`;

    return this.calendarService.buildInstantEvent({
      categories: DailyCyclesBuilderService.lunarCategories,
      date,
      description,
      logger: this.logger,
      summary,
      timezone: "America/New_York",
    });
  }

  /**
   * Creates a moonset calendar event.
   *
   * Moonset occurs when the Moon crosses the horizon from above, disappearing
   * from view. The timing accounts for the Moon's apparent radius to mark when
   * the upper limb dips below the horizon.
   *
   * @param date - Precise UTC time of moonset.
   * @returns Calendar event for moonset with emoji summary.
   * @see {@link isSet} for set detection criteria
   *
   * @example
   * ```typescript
   * const event = getMoonsetEvent(new Date('2025-01-22T01:15:00Z'));
   * // event.summary === '🌙 🔽 Moonset'
   * ```
   */
  buildMoonsetEvent(date: Moment): DetectedCalendarEvent {
    const description = "Moonset";
    const summary = `🌙 🔽 ${description}`;

    return this.calendarService.buildInstantEvent({
      categories: DailyCyclesBuilderService.lunarCategories,
      date,
      description,
      logger: this.logger,
      summary,
      timezone: "America/New_York",
    });
  }

  /**
   * Creates a formatted calendar event for solar nadir (solar midnight).
   *
   * Generates a calendar event marking the moment when Sun reaches its lowest point
   * below the horizon (local minimum elevation). This occurs near local solar midnight,
   * when Sun crosses the anti-meridian (north-south line through nadir, opposite of zenith).
   *
   * @param date - Exact time of solar nadir.
   * @returns Calendar event with summary, description, and standard solar cycle categories.
   *
   * @remarks
   * - Summary: "☀️ ⬇️ Solar Nadir"
   * - Emoji: ☀️ (sun), ⬇️ (double downward arrow)
   * - Also known as "solar midnight" or "anti-transit"
   * - Logs event to console with America/New_York timezone
   * - Nadir elevation is negative (below horizon) and depends on latitude/declination
   * - At north pole on winter solstice: nadir elevation ≈ -23.5° (sun doesn't rise)
   * - Solar midnight time differs from clock midnight due to equation of time and longitude
   * - Opposite point to solar zenith (180° away on celestial sphere)
   *
   * @see {@link isMinimum} for nadir detection algorithm
   * @see {@link categories} for event categorization
   *
   * @example
   * ```typescript
   * const event = getSolarNadirEvent(new Date('2026-01-22T05:30:00Z'));
   * // Returns: { summary: "☀️ ⬇️ Solar Nadir", start: ..., end: ..., ... }
   * ```
   */
  buildSolarNadirEvent(date: Moment): DetectedCalendarEvent {
    const description = "Solar Nadir";
    const summary = `☀️ ⏬ ${description}`;

    return this.calendarService.buildInstantEvent({
      categories: DailyCyclesBuilderService.solarCategories,
      date,
      description,
      logger: this.logger,
      summary,
      timezone: "America/New_York",
    });
  }

  /**
   * Creates a formatted calendar event for solar zenith (solar noon).
   *
   * Generates a calendar event marking the moment when Sun reaches its highest point
   * in the sky (local maximum elevation). This occurs near local solar noon, when
   * Sun crosses the meridian (north-south line through zenith and nadir).
   *
   * @param date - Exact time of solar zenith.
   * @returns Calendar event with summary, description, and standard solar cycle categories.
   *
   * @remarks
   * - Summary: "☀️ ⬆️ Solar Zenith"
   * - Emoji: ☀️ (sun), ⬆️ (double upward arrow)
   * - Also known as "solar noon" or "meridian transit"
   * - Logs event to console with America/New_York timezone
   * - Maximum elevation depends on observer latitude and Sun's declination
   * - At equator on equinox: zenith elevation = 90° (directly overhead)
   * - Solar zenith time differs from clock noon due to equation of time and longitude
   *
   * @see {@link isMaximum} for zenith detection algorithm
   * @see {@link categories} for event categorization
   *
   * @example
   * ```typescript
   * const event = getSolarZenithEvent(new Date('2026-01-21T17:30:00Z'));
   * // Returns: { summary: "☀️ ⬆️ Solar Zenith", start: ..., end: ..., ... }
   * ```
   */
  buildSolarZenithEvent(date: Moment): DetectedCalendarEvent {
    const description = "Solar Zenith";
    const summary = `☀️ ⏫ ${description}`;

    return this.calendarService.buildInstantEvent({
      categories: DailyCyclesBuilderService.solarCategories,
      date,
      description,
      logger: this.logger,
      summary,
      timezone: "America/New_York",
    });
  }

  /**
   * Creates a formatted calendar event for sunrise.
   *
   * Generates a calendar event marking the moment when Sun's center crosses the
   * horizon moving upward (geometric sunrise, not accounting for atmospheric refraction).
   *
   * @param date - Exact time of sunrise.
   * @returns Calendar event with summary, description, and standard solar cycle categories.
   *
   * @remarks
   * - Summary: "☀️ 🔼 Sunrise"
   * - Emoji: ☀️ (sun), 🔼 (upward arrow)
   * - Logs event to console with America/New_York timezone
   * - Uses geometric horizon (0° elevation), not visual horizon
   * - Does not account for atmospheric refraction (~34 arcminutes)
   * - Does not account for observer altitude above sea level
   *
   * @see {@link isRise} for sunrise detection algorithm
   * @see {@link categories} for event categorization
   *
   * @example
   * ```typescript
   * const event = getSunriseEvent(new Date('2026-01-21T12:15:00Z'));
   * // Returns: { summary: "☀️ 🔼 Sunrise", start: ..., end: ..., ... }
   * ```
   */
  buildSunriseEvent(date: Moment): DetectedCalendarEvent {
    const description = "Sunrise";
    const summary = `☀️ 🔼 ${description}`;

    return this.calendarService.buildInstantEvent({
      categories: DailyCyclesBuilderService.solarCategories,
      date,
      description,
      logger: this.logger,
      summary,
      timezone: "America/New_York",
    });
  }

  /**
   * Creates a formatted calendar event for sunset.
   *
   * Generates a calendar event marking the moment when Sun's center crosses the
   * horizon moving downward (geometric sunset, not accounting for atmospheric refraction).
   *
   * @param date - Exact time of sunset.
   * @returns Calendar event with summary, description, and standard solar cycle categories.
   *
   * @remarks
   * - Summary: "☀️ 🔽 Sunset"
   * - Emoji: ☀️ (sun), 🔽 (downward arrow)
   * - Logs event to console with America/New_York timezone
   * - Uses geometric horizon (0° elevation), not visual horizon
   * - Does not account for atmospheric refraction (~34 arcminutes)
   * - Does not account for observer altitude above sea level
   * - Marks beginning of nautical/civil twilight period
   *
   * @see {@link isSet} for sunset detection algorithm
   * @see {@link categories} for event categorization
   *
   * @example
   * ```typescript
   * const event = getSunsetEvent(new Date('2026-01-22T00:45:00Z'));
   * // Returns: { summary: "☀️ 🔽 Sunset", start: ..., end: ..., ... }
   * ```
   */
  buildSunsetEvent(date: Moment): DetectedCalendarEvent {
    const description = "Sunset";
    const summary = `☀️ 🔽 ${description}`;

    return this.calendarService.buildInstantEvent({
      categories: DailyCyclesBuilderService.solarCategories,
      date,
      description,
      logger: this.logger,
      summary,
      timezone: "America/New_York",
    });
  }

  /**
   * Reads elevation (degrees) for one timestamp from azimuth/elevation ephemeris.
   */
  getElevationAt(
    ephemeris: AzimuthElevationEphemeris,
    timestamp: Moment,
  ): number {
    return this.ephemerisService.getAzimuthElevationFromEphemeris(
      ephemeris,
      timestamp.toISOString(),
      "elevation",
    );
  }

  /**
   * Returns previous/current/next-minute elevation values used by extrema crossing logic.
   */
  getElevationWindow(args: {
    ephemeris: AzimuthElevationEphemeris;
    minute: Moment;
  }): {
    current: number;
    next: number;
    previous: number;
  } {
    const { ephemeris, minute } = args;
    const previous = this.getElevationAt(
      ephemeris,
      minute.clone().subtract(1, "minute"),
    );
    const current = this.getElevationAt(ephemeris, minute);
    const next = this.getElevationAt(
      ephemeris,
      minute.clone().add(1, "minute"),
    );
    return { current, next, previous };
  }

  /**
   * Returns how far the body's upper limb stands above the horizon, in
   * degrees, at the previous, current and next minute. Zero is the moment of
   * rise or set: the true elevation equals the standard altitude
   * −(34′ refraction + semidiameter), so the Sun uses −0.8333° and the Moon
   * its own topocentric semidiameter (its parallax is already in the
   * topocentric elevation).
   */
  getHorizonClearanceWindow(args: {
    body: AzimuthElevationEphemerisBody;
    ephemeris: AzimuthElevationEphemeris;
    minute: Moment;
  }): { current: number; next: number; previous: number } {
    const { body, ephemeris, minute } = args;
    const clearanceAt = (timestamp: Moment): number => {
      const isoTimestamp = timestamp.toISOString();
      const trueElevation =
        this.ephemerisService.getAzimuthElevationFromEphemeris(
          ephemeris,
          isoTimestamp,
          "trueElevation",
        );
      const semidiameter =
        body === "sun"
          ? DailyCyclesBuilderService.sunSemidiameterDegrees
          : this.ephemerisService.getAzimuthElevationFromEphemeris(
              ephemeris,
              isoTimestamp,
              "semidiameter",
            );
      return (
        trueElevation +
        DailyCyclesBuilderService.horizonRefractionDegrees +
        semidiameter
      );
    };
    return {
      current: clearanceAt(minute),
      next: clearanceAt(minute.clone().add(1, "minute")),
      previous: clearanceAt(minute.clone().subtract(1, "minute")),
    };
  }

  /**
   * Detects a rise at this minute: the upper limb's clearance crosses zero
   * upward, and the crossing rounds to this minute rather than a neighbor.
   */
  isRise(args: { current: number; next: number; previous: number }): boolean {
    return DailyCyclesBuilderService.crossesUpwardNearCurrent(args);
  }

  /**
   * Detects a set at this minute: the upper limb's clearance crosses zero
   * downward, and the crossing rounds to this minute rather than a neighbor.
   */
  isSet(args: { current: number; next: number; previous: number }): boolean {
    const { current, next, previous } = args;
    return DailyCyclesBuilderService.crossesUpwardNearCurrent({
      current: -current,
      next: -next,
      previous: -previous,
    });
  }
}
