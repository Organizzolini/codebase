import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import { MARGIN_MINUTES } from "../caelundas/caelundas.constants";
import { EphemerisService } from "../ephemeris/ephemeris.service";
import { ProgressiveUtilitiesService } from "../progressive/progressive-utilities.service";

import { AnnualSolarCycleEventsService } from "./annual-solar-cycle-events.service";
import {
  ANNUAL_SOLAR_CYCLE_BASE_CATEGORIES,
  APHELION_CATEGORY,
  PERIHELION_CATEGORY,
  SOLAR_ADVANCING_CATEGORY,
  SOLAR_ADVANCING_DESCRIPTION,
  SOLAR_ADVANCING_SUMMARY,
  SOLAR_RETREATING_CATEGORY,
  SOLAR_RETREATING_DESCRIPTION,
  SOLAR_RETREATING_SUMMARY,
} from "./annual-solar-cycle.constants";

import type { DetectedCalendarEvent } from "../caelundas-database/caelundas-database.types";
import type { DistanceEphemeris } from "../ephemeris/ephemeris.types";
import type {
  DetectAnnualSolarCycleArguments,
  DetectAnnualSolarCycleEventsArguments,
  DetectSolarApsisEventsArguments,
  SolarCycleLongitudes,
  SolarDistanceSample,
} from "./annual-solar-cycle.types";
import type { Moment } from "moment-timezone";

/**
 * Detects key annual solar cycle events based on the Sun's ecliptic longitude and distance.
 *
 * Identifies solstices, equinoxes, Celtic cross-quarter days, hexadecans (16-part ecliptic
 * divisions), and solar apsis events (perihelion and aphelion).
 */
@Injectable()
export class AnnualSolarCycleService {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly ephemerisService: EphemerisService,
    private readonly progressiveUtilitiesService: ProgressiveUtilitiesService,
    private readonly annualSolarCycleEventsService: AnnualSolarCycleEventsService,
  ) {
    this.logger.setContext(AnnualSolarCycleService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Pairs aphelion-to-perihelion markers into Solar Advancing duration events. */
  private getAdvancingProgressiveEvents(
    aphelionEvents: DetectedCalendarEvent[],
    perihelionEvents: DetectedCalendarEvent[],
  ): DetectedCalendarEvent[] {
    const advancingPairs =
      this.progressiveUtilitiesService.pairProgressiveEvents(
        aphelionEvents,
        perihelionEvents,
        SOLAR_ADVANCING_DESCRIPTION,
      );
    return advancingPairs.map(([beginning, ending]) =>
      this.getSolarAdvancingDurationEvent(beginning, ending),
    );
  }

  /** Pairs perihelion-to-aphelion markers into Solar Retreating duration events. */
  private getRetreatingProgressiveEvents(
    perihelionEvents: DetectedCalendarEvent[],
    aphelionEvents: DetectedCalendarEvent[],
  ): DetectedCalendarEvent[] {
    const retreatingPairs =
      this.progressiveUtilitiesService.pairProgressiveEvents(
        perihelionEvents,
        aphelionEvents,
        SOLAR_RETREATING_DESCRIPTION,
      );
    return retreatingPairs.map(([beginning, ending]) =>
      this.getSolarRetreatingDurationEvent(beginning, ending),
    );
  }

  /** Builds the progressive span event for Earth moving from aphelion toward perihelion. */
  private getSolarAdvancingDurationEvent(
    beginning: DetectedCalendarEvent,
    ending: DetectedCalendarEvent,
  ): DetectedCalendarEvent {
    return {
      categories: [
        ...ANNUAL_SOLAR_CYCLE_BASE_CATEGORIES,
        SOLAR_ADVANCING_CATEGORY,
      ],
      description: SOLAR_ADVANCING_DESCRIPTION,
      end: ending.start,
      start: beginning.start,
      summary: SOLAR_ADVANCING_SUMMARY,
    };
  }

  /**
   * Samples Sun-Earth distance at the minute and across the margin on either
   * side, so an extremum is judged against its whole neighborhood.
   */
  private getSolarDistances(
    minute: Moment,
    sunDistanceEphemeris: DistanceEphemeris,
  ): SolarDistanceSample {
    const getDistance = (offsetMinutes: number): number =>
      this.ephemerisService.getDistanceFromEphemeris(
        sunDistanceEphemeris,
        minute.clone().add(offsetMinutes, "minutes").toISOString(),
        "distance",
      );
    const previous = Array.from({ length: MARGIN_MINUTES }, (_, index) =>
      getDistance(index - MARGIN_MINUTES),
    );
    const next = Array.from({ length: MARGIN_MINUTES }, (_, index) =>
      getDistance(index + 1),
    );
    return { current: getDistance(0), next, previous };
  }

  /** Builds the progressive span event for Earth moving from perihelion toward aphelion. */
  private getSolarRetreatingDurationEvent(
    beginning: DetectedCalendarEvent,
    ending: DetectedCalendarEvent,
  ): DetectedCalendarEvent {
    return {
      categories: [
        ...ANNUAL_SOLAR_CYCLE_BASE_CATEGORIES,
        SOLAR_RETREATING_CATEGORY,
      ],
      description: SOLAR_RETREATING_DESCRIPTION,
      end: ending.start,
      start: beginning.start,
      summary: SOLAR_RETREATING_SUMMARY,
    };
  }

  /**
   * Whether the sampled distance is the farthest across its whole margin.
   *
   * A single glitched minute in the ephemeris can fake a one-minute extremum;
   * requiring the margin on both sides to be lower rejects it. Strict on the
   * earlier side so a tie yields the first minute only.
   */
  private isDistanceMaximum(samples: SolarDistanceSample): boolean {
    const { current, next, previous } = samples;
    return (
      previous.every((distance) => distance < current) &&
      next.every((distance) => distance <= current)
    );
  }

  /** Whether the sampled distance is the nearest across its whole margin. */
  private isDistanceMinimum(samples: SolarDistanceSample): boolean {
    const { current, next, previous } = samples;
    return (
      previous.every((distance) => distance > current) &&
      next.every((distance) => distance >= current)
    );
  }

  // 🌎 Public Methods

  /**
   * Detects annual solar cycle events at a specific minute.
   *
   * Identifies key solar positions throughout the year: solstices (longest/shortest
   * days), equinoxes (equal day/night), cross-quarter days (Celtic festivals), and
   * hexadecans (16-part division of the ecliptic). Uses the Sun's ecliptic longitude
   * to determine precise crossing times.
   *
   * @see {@link getCoordinateFromEphemeris} for position retrieval
   * @see {@link isVernalEquinox} for equinox detection algorithms
   *
   * @remarks
   * Solar longitude markers:
   * - 0° = Vernal Equinox
   * - 90° = Summer Solstice
   * - 180° = Autumnal Equinox
   * - 270° = Winter Solstice
   * - Cross-quarters at 45° increments (Beltane, Lammas, Samhain, Imbolc)
   * - Hexadecans at 22.5° increments
   *
   * @example
   * ```typescript
   * const events = getAnnualSolarCycleEvents({
   *   sunCoordinateEphemeris,
   *   currentMinute: moment('2025-03-20T09:01')
   * });
   * Returns [vernalEquinoxEvent] when Sun crosses 0° longitude
   * ```
   */
  detect(args: DetectAnnualSolarCycleArguments): DetectedCalendarEvent[] {
    return [
      ...this.getAnnualSolarCycleEvents(args),
      ...this.getSolarApsisEvents(args),
    ];
  }

  /**
   * Generates progressive events for Earth's orbit between apsis points.
   *
   * Creates two types of progressive events based on Earth's orbital position:
   * - Advancing: Aphelion to Perihelion (Earth moving closer to Sun, speeding up)
   * - Retreating: Perihelion to Aphelion (Earth moving away from Sun, slowing down).
   *
   * @see {@link pairProgressiveEvents} for event pairing logic
   *
   * @remarks
   * Based on Kepler's second law: planets sweep out equal areas in equal times,
   * so Earth moves faster when closer to the Sun (perihelion).
   */
  detectProgressive(events: DetectedCalendarEvent[]): DetectedCalendarEvent[] {
    const solarApsisEvents = events.filter((event) =>
      event.categories.includes("Annual Solar Cycle"),
    );
    const perihelionEvents = solarApsisEvents.filter((event) =>
      event.categories.includes(PERIHELION_CATEGORY),
    );
    const aphelionEvents = solarApsisEvents.filter((event) =>
      event.categories.includes(APHELION_CATEGORY),
    );
    return [
      ...this.getAdvancingProgressiveEvents(aphelionEvents, perihelionEvents),
      ...this.getRetreatingProgressiveEvents(perihelionEvents, aphelionEvents),
    ];
  }

  /**
   * Detects solstice, equinox, cross-quarter, and hexadecan events at a specific minute.
   *
   * Compares the Sun's ecliptic longitude against threshold values for all annual solar
   * cycle markers: the 4 seasonal turning points, 4 Celtic cross-quarter days,
   * and 8 hexadecan midpoints (22.5° increments).
   *
   */
  getAnnualSolarCycleEvents(
    args: DetectAnnualSolarCycleEventsArguments,
  ): DetectedCalendarEvent[] {
    const { minute, sunCoordinateEphemeris: ephemeris } = args;
    const previousMinute = minute.clone().subtract(1, "minute");
    const currentLongitude = this.ephemerisService.getCoordinateFromEphemeris(
      ephemeris,
      minute.toISOString(),
      "longitude",
    );
    const previousLongitude = this.ephemerisService.getCoordinateFromEphemeris(
      ephemeris,
      previousMinute.toISOString(),
      "longitude",
    );
    const longitudes: SolarCycleLongitudes = {
      currentLongitude,
      previousLongitude,
    };
    return [
      ...this.annualSolarCycleEventsService.getVernalToAutumnalEvents(
        longitudes,
        minute,
      ),
      ...this.annualSolarCycleEventsService.getAutumnalToVernalEvents(
        longitudes,
        minute,
      ),
    ];
  }

  /**
   * Detects solar apsis events (perihelion and aphelion).
   *
   * Identifies when Earth reaches its closest (perihelion) and farthest (aphelion)
   * points from the Sun. These occur once per year and affect Earth's orbital speed
   * and apparent solar diameter. Perihelion typically occurs in early January,
   * aphelion in early July.
   *
   * @see {@link getDistanceFromEphemeris} for distance retrieval
   * @see {@link isDistanceMaximum} for aphelion detection
   * @see {@link isDistanceMinimum} for perihelion detection
   *
   * @remarks
   * Perihelion: ~147.1 million km (Earth moving fastest, ~30.3 km/s)
   * Aphelion: ~152.1 million km (Earth moving slowest, ~29.3 km/s)
   *
   * @example
   * ```typescript
   * const events = getSolarApsisEvents({
   *   currentMinute: moment('2025-01-04T12:00'),
   *   sunDistanceEphemeris
   * });
   * // Returns [perihelionEvent] when Earth is closest to Sun
   * ```
   */
  getSolarApsisEvents(
    args: DetectSolarApsisEventsArguments,
  ): DetectedCalendarEvent[] {
    const { minute, sunDistanceEphemeris } = args;
    const distances = this.getSolarDistances(minute, sunDistanceEphemeris);
    const solarApsisEvents: DetectedCalendarEvent[] = [];
    if (this.isDistanceMaximum(distances)) {
      solarApsisEvents.push(
        this.annualSolarCycleEventsService.buildAphelionEvent(minute),
      );
    }
    if (this.isDistanceMinimum(distances)) {
      solarApsisEvents.push(
        this.annualSolarCycleEventsService.buildPerihelionEvent(minute),
      );
    }
    return solarApsisEvents;
  }
}
