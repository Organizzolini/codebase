import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logger";

import { MathService } from "../math/math.service";

import { DailyCyclesBuilderService } from "./daily-cycles-builder.service";

import type { Event } from "../calendar/calendar.types";
import type { AzimuthElevationEphemeris } from "../ephemeris/ephemeris.types";
import type { Moment } from "moment-timezone";

/**
 * Detects daily solar and lunar cycle events based on azimuth and elevation data.
 *
 * Identifies the four key daily positions for both Sun and Moon: rise (horizon crossing
 * upward), zenith (highest point), set (horizon crossing downward), and nadir (lowest point).
 */
@Injectable()
export class DailyCyclesService {
  // 🏗 Dependency Injection

  constructor(
    private readonly mathService: MathService,
    private readonly dailyCyclesBuilderService: DailyCyclesBuilderService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(DailyCyclesService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  static readonly sunRadiusDegrees = 16 / MathService.arcminutesPerDegree;

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Detects daily solar cycle events at a specific time point.
   *
   * Analyzes Sun's elevation angle over three consecutive minutes to identify the
   * four key daily events: sunrise (elevation crosses 0° upward), solar zenith
   * (local maximum elevation), sunset (elevation crosses 0° downward), and solar
   * nadir (local minimum elevation).
   *
   *
   * @remarks
   * - Uses ±1 minute window (previous, current, next) for event detection
   * - **Sunrise**: Elevation crosses 0° horizon moving upward (isRise)
   * - **Solar Zenith**: Local maximum elevation (typically near local noon)
   * - **Sunset**: Elevation crosses 0° horizon moving downward (isSet)
   * - **Solar Nadir**: Local minimum elevation (typically near local midnight)
   * - Returns empty array if no event detected at this time
   * - At most one event type detected per minute (events well-separated in time)
   * - Elevation is measured from horizon: 0° = horizon, 90° = directly overhead (zenith)
   * - Does not account for atmospheric refraction (uses geometric elevation)
   *
   * @see {@link isRise} for sunrise detection (horizon crossing upward)
   * @see {@link isSet} for sunset detection (horizon crossing downward)
   * @see {@link isMaximum} for solar zenith detection (elevation maximum)
   * @see {@link isMinimum} for solar nadir detection (elevation minimum)
   * @see {@link buildSunriseEvent} for sunrise event formatting
   * @see {@link buildSolarZenithEvent} for zenith event formatting
   * @see {@link buildSunsetEvent} for sunset event formatting
   * @see {@link buildSolarNadirEvent} for nadir event formatting
   *
   * @example
   * ```typescript
   * const events = getDailySolarCycleEvents({
   *   currentMinute: moment('2026-01-21T12:15:00Z'),
   *   sunAzimuthElevationEphemeris: ephemeris
   * });
   * // Returns: [{ summary: "☀️ ⬆️ Solar Zenith", start: ..., ... }]
   * ```
   */
  /**
   * Creates a lunar nadir calendar event.
   */
  buildLunarNadirEvent(date: Moment): Event {
    return this.dailyCyclesBuilderService.buildLunarNadirEvent(date);
  }

  /**
   * Creates a lunar zenith (culmination) calendar event.
   */
  buildLunarZenithEvent(date: Moment): Event {
    return this.dailyCyclesBuilderService.buildLunarZenithEvent(date);
  }

  /**
   * Creates a moonrise calendar event.
   */
  buildMoonriseEvent(date: Moment): Event {
    return this.dailyCyclesBuilderService.buildMoonriseEvent(date);
  }

  /**
   * Creates a moonset calendar event.
   */
  buildMoonsetEvent(date: Moment): Event {
    return this.dailyCyclesBuilderService.buildMoonsetEvent(date);
  }

  /**
   * Creates a formatted calendar event for solar nadir (solar midnight).
   */
  buildSolarNadirEvent(date: Moment): Event {
    return this.dailyCyclesBuilderService.buildSolarNadirEvent(date);
  }

  /**
   * Creates a formatted calendar event for solar zenith (solar noon).
   */
  buildSolarZenithEvent(date: Moment): Event {
    return this.dailyCyclesBuilderService.buildSolarZenithEvent(date);
  }

  /**
   * Creates a formatted calendar event for sunrise.
   */
  buildSunriseEvent(date: Moment): Event {
    return this.dailyCyclesBuilderService.buildSunriseEvent(date);
  }

  /**
   * Creates a formatted calendar event for sunset.
   */
  buildSunsetEvent(date: Moment): Event {
    return this.dailyCyclesBuilderService.buildSunsetEvent(date);
  }

  /**
   * Runs both solar and lunar per-minute detectors and concatenates all hits.
   */
  detect(args: {
    minute: Moment;
    moonAzimuthElevationEphemeris: AzimuthElevationEphemeris;
    sunAzimuthElevationEphemeris: AzimuthElevationEphemeris;
  }): Event[] {
    const events = [
      ...this.getDailySolarCycleEvents(args),
      ...this.getDailyLunarCycleEvents(args),
    ];
    this.logger.debug("🔍 Detected daily cycle events", undefined, {
      count: events.length,
    });
    return events;
  }

  /**
   * Detects daily lunar cycle events at a specific minute.
   *
   * Analyzes the Moon's elevation at the current minute and surrounding minutes
   * to identify key daily events: moonrise (horizon crossing upward), lunar zenith
   * (culmination/highest point), moonset (horizon crossing downward), and lunar nadir
   * (lowest point below horizon). Uses elevation thresholds accounting for the Moon's
   * apparent diameter.
   *
   * @see {@link getAzimuthElevationFromEphemeris} for ephemeris data retrieval
   * @see {@link isRise} for rise detection algorithm
   * @see {@link isSet} for set detection algorithm
   *
   * @example
   * ```typescript
   * const events = getDailyLunarCycleEvents({
   *   currentMinute: moment(),
   *   moonAzimuthElevationEphemeris
   * });
   * // Returns events like moonrise, zenith, moonset, nadir
   * ```
   */
  getDailyLunarCycleEvents(args: {
    minute: Moment;
    moonAzimuthElevationEphemeris: AzimuthElevationEphemeris;
  }): Event[] {
    const { minute, moonAzimuthElevationEphemeris } = args;
    const dailyLunarCycleEvents: Event[] = [];
    const elevationWindow = this.dailyCyclesBuilderService.getElevationWindow({
      ephemeris: moonAzimuthElevationEphemeris,
      minute,
    });

    if (this.dailyCyclesBuilderService.isRise({ ...elevationWindow })) {
      dailyLunarCycleEvents.push(
        this.dailyCyclesBuilderService.buildMoonriseEvent(minute),
      );
    }
    if (this.mathService.isMaximum({ ...elevationWindow })) {
      dailyLunarCycleEvents.push(
        this.dailyCyclesBuilderService.buildLunarZenithEvent(minute),
      );
    }
    if (this.dailyCyclesBuilderService.isSet({ ...elevationWindow })) {
      dailyLunarCycleEvents.push(
        this.dailyCyclesBuilderService.buildMoonsetEvent(minute),
      );
    }
    if (this.mathService.isMinimum({ ...elevationWindow })) {
      dailyLunarCycleEvents.push(
        this.dailyCyclesBuilderService.buildLunarNadirEvent(minute),
      );
    }

    return dailyLunarCycleEvents;
  }

  /**
   * Detects daily solar cycle events at a specific minute.
   *
   * Checks for sunrise (elevation crosses 0° upward), solar zenith (local maximum),
   * sunset (elevation crosses 0° downward), and solar nadir (local minimum) by comparing
   * elevation values at the previous, current, and next minute.
   *
   */
  getDailySolarCycleEvents(args: {
    minute: Moment;
    sunAzimuthElevationEphemeris: AzimuthElevationEphemeris;
  }): Event[] {
    const { minute, sunAzimuthElevationEphemeris } = args;
    const dailySolarCycleEvents: Event[] = [];
    const elevationWindow = this.dailyCyclesBuilderService.getElevationWindow({
      ephemeris: sunAzimuthElevationEphemeris,
      minute,
    });

    if (this.dailyCyclesBuilderService.isRise({ ...elevationWindow })) {
      dailySolarCycleEvents.push(
        this.dailyCyclesBuilderService.buildSunriseEvent(minute),
      );
    }
    if (this.mathService.isMaximum({ ...elevationWindow })) {
      dailySolarCycleEvents.push(
        this.dailyCyclesBuilderService.buildSolarZenithEvent(minute),
      );
    }
    if (this.dailyCyclesBuilderService.isSet({ ...elevationWindow })) {
      dailySolarCycleEvents.push(
        this.dailyCyclesBuilderService.buildSunsetEvent(minute),
      );
    }
    if (this.mathService.isMinimum({ ...elevationWindow })) {
      dailySolarCycleEvents.push(
        this.dailyCyclesBuilderService.buildSolarNadirEvent(minute),
      );
    }

    return dailySolarCycleEvents;
  }
}
