import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logger";

import {
  MARGIN_MINUTES,
  retrogradeBodies,
} from "../caelundas/caelundas.constants";
import { capitalize } from "../caelundas/caelundas.types";
import {
  symbolByBody,
  symbolByOrbitalDirection,
} from "../caelundas/symbol-caelundas.constants";
import { EphemerisService } from "../ephemeris/ephemeris.service";
import { MathService } from "../math/math.service";
import { ProgressiveUtilitiesService } from "../progressive/progressive-utilities.service";

import type {
  OrbitalDirection,
  RetrogradeBody,
} from "../caelundas/caelundas.types";
import type { Event } from "../calendar/calendar.types";
import type { CoordinateEphemeris } from "../ephemeris/ephemeris.types";
import type { Moment } from "moment-timezone";

/**
 * Detects planetary retrograde and direct station events from minute-by-minute ecliptic longitude series.
 *
 * Identifies stationary points where a planet's apparent motion reverses direction, emitting
 * "Stationary Retrograde" and "Stationary Direct" boundary events as well as progressive duration spans.
 */
@Injectable()
export class RetrogradesService {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly ephemerisService: EphemerisService,
    private readonly mathService: MathService,
    private readonly progressiveUtilitiesService: ProgressiveUtilitiesService,
  ) {
    this.logger.setContext(RetrogradesService.name);
  }

  // 🔐 Private Fields

  private static readonly categories = ["Astronomy", "Astrology", "Direction"];

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Detects body stations.
   */
  private detectBodyStations(
    body: RetrogradeBody,
    ephemeris: CoordinateEphemeris,
    minute: Moment,
  ): Event[] {
    const events: Event[] = [];
    const currentLongitude = this.ephemerisService.getCoordinateFromEphemeris(
      ephemeris,
      minute.toISOString(),
      "longitude",
    );
    const previousLongitudes = this.getPreviousLongitudes(ephemeris, minute);
    const nextLongitudes = this.getNextLongitudes(ephemeris, minute);
    const longitudes = { currentLongitude, nextLongitudes, previousLongitudes };
    if (this.isRetrograde({ ...longitudes })) {
      events.push(
        this.buildRetrogradeEvent({
          body,
          direction: "retrograde",
          timestamp: minute,
        }),
      );
    }
    if (this.isDirect({ ...longitudes })) {
      events.push(
        this.buildRetrogradeEvent({
          body,
          direction: "direct",
          timestamp: minute,
        }),
      );
    }
    return events;
  }

  /**
   * Derives next longitudes.
   */
  private getNextLongitudes(
    ephemeris: CoordinateEphemeris,
    minute: Moment,
  ): number[] {
    return Array.from({ length: MARGIN_MINUTES }, (_, index) => {
      const date = minute.clone().add(index + 1, "minutes");
      return this.ephemerisService.getCoordinateFromEphemeris(
        ephemeris,
        date.toISOString(),
        "longitude",
      );
    });
  }

  /**
   * Derives previous longitudes.
   */
  private getPreviousLongitudes(
    ephemeris: CoordinateEphemeris,
    minute: Moment,
  ): number[] {
    return Array.from({ length: MARGIN_MINUTES }, (_, index) => {
      const date = minute.clone().subtract(MARGIN_MINUTES - index, "minutes");
      return this.ephemerisService.getCoordinateFromEphemeris(
        ephemeris,
        date.toISOString(),
        "longitude",
      );
    });
  }

  /**
   * Derives retrograde progressive event.
   */
  private getRetrogradeProgressiveEvent(
    beginningEvent: Event,
    endingEvent: Event,
    planet: RetrogradeBody,
  ): Event {
    const start = beginningEvent.start;
    const end = endingEvent.start;

    const planetCapitalized = planet.charAt(0).toUpperCase() + planet.slice(1);

    // Extract planet symbol from beginning event summary (first non-whitespace character sequence)
    const symbolMatch = /^(\S+)/.exec(beginningEvent.summary);
    const symbol = symbolMatch ? symbolMatch[1] : "";

    return {
      categories: ["Astronomy", "Astrology", "Retrogrades"],
      description: `${planetCapitalized} Retrograde`,
      end,
      start,
      summary: `${symbol} ↩️ ${planetCapitalized} Retrograde`,
    };
  }

  /**
   * Determines whether direct.
   */
  private isDirect(args: {
    currentLongitude: number;
    nextLongitudes: number[];
    previousLongitudes: number[];
  }): boolean {
    const { currentLongitude, nextLongitudes, previousLongitudes } = args;

    const hasBeenRetrograde = previousLongitudes.every((previousLongitude) => {
      const previousLongitudeNormalized =
        this.mathService.normalizeForComparison(
          previousLongitude,
          currentLongitude,
        );
      return previousLongitudeNormalized > currentLongitude;
    });

    const willBeDirect = nextLongitudes.every((nextLongitude) => {
      const nextLongitudeNormalized = this.mathService.normalizeForComparison(
        nextLongitude,
        currentLongitude,
      );
      return nextLongitudeNormalized >= currentLongitude;
    });

    return hasBeenRetrograde && willBeDirect;
  }

  /**
   * Determines whether retrograde.
   */
  private isRetrograde(args: {
    currentLongitude: number;
    nextLongitudes: number[];
    previousLongitudes: number[];
  }): boolean {
    const { currentLongitude, nextLongitudes, previousLongitudes } = args;

    const hasBeenDirect = previousLongitudes.every((previousLongitude) => {
      const previousLongitudeNormalized =
        this.mathService.normalizeForComparison(
          previousLongitude,
          currentLongitude,
        );
      return previousLongitudeNormalized < currentLongitude;
    });

    const willBeRetrograde = nextLongitudes.every((nextLongitude) => {
      const nextLongitudeNormalized = this.mathService.normalizeForComparison(
        nextLongitude,
        currentLongitude,
      );
      return nextLongitudeNormalized <= currentLongitude;
    });

    return hasBeenDirect && willBeRetrograde;
  }

  // 🌎 Public Methods

  /**
   * Creates a formatted calendar event for a retrograde or direct station.
   *
   * Generates a calendar event with Unicode symbols and descriptive text for a
   * planetary stationary point. Events are categorized by direction to distinguish
   * retrograde stations from direct stations.
   *
   * @remarks
   * - Summary format: `[bodySymbol] [directionSymbol] [Body] Stationary [Direction]`
   * - Example retrograde: "☿ ↩️ Mercury Stationary Retrograde"
   * - Example direct: "☿ ➡️ Mercury Stationary Direct"
   * - Adds "Retrograde" or "Direct" category based on direction
   * - Uses Unicode astronomical symbols: ☿ (Mercury), ♀ (Venus), ♂ (Mars), ♃ (Jupiter), etc.
   * - Direction symbols: ↩️ (retrograde), ➡️ (direct)
   * - Logs event to console with ISO timestamp
   *
   * @see {@link symbolByBody} for planetary Unicode symbols
   * @see {@link symbolByOrbitalDirection} for direction symbols
   * @see {@link Event} for calendar event structure
   *
   * @example
   * ```typescript
   * const event = getRetrogradeEvent({
   *   body: "mercury",
   *   timestamp: new Date('2026-03-15T08:30:00Z'),
   *   direction: "retrograde"
   * });
   * // Returns: { summary: "☿ ↩️ Mercury Stationary Retrograde", start: ..., ... }
   * ```
   */
  buildRetrogradeEvent(args: {
    body: RetrogradeBody;
    direction: OrbitalDirection;
    timestamp: Moment;
  }): Event {
    const { body, direction, timestamp } = args;

    const bodyCapitalized = capitalize(body);
    const orbitalDirectionCapitalized = capitalize(direction);

    const retrogradeBodySymbol = symbolByBody[body];
    const orbitalDirectionSymbol = symbolByOrbitalDirection[direction];

    const description = `${bodyCapitalized} Stationary ${orbitalDirectionCapitalized}`;
    const summary = `${retrogradeBodySymbol} ${orbitalDirectionSymbol} ${description}`;

    this.logger.info("🗓️ Built a calendar event", undefined, {
      at: timestamp.toISOString(),
      summary,
    });

    const retrogradeEvent: Event = {
      categories: [
        ...RetrogradesService.categories,
        ...(direction === "retrograde" ? ["Retrograde"] : ["Direct"]),
      ],
      description,
      end: timestamp,
      start: timestamp,
      summary,
    };

    return retrogradeEvent;
  }

  /**
   * Detects retrograde and direct station events at a specific time point.
   *
   * Analyzes planetary motion patterns to identify stationary points where planets
   * transition between direct and retrograde motion. Uses a sliding window of
   * {@link MARGIN_MINUTES} to detect direction reversals in ecliptic longitude.
   *
   *
   * @remarks
   * - Checks only {@link retrogradeBodies} (Mercury through Pluto, excluding Sun/Moon)
   * - Uses ±{@link MARGIN_MINUTES} window for robust direction change detection
   * - **Stationary Retrograde**: Planet stops moving forward and begins backward motion
   * - **Stationary Direct**: Planet stops retrograde motion and resumes forward motion
   * - Detection looks for local extrema (turning points) in longitude time series
   * - Returns empty array if no stations detected at this time
   *
   * @see {@link isRetrograde} for retrograde station detection algorithm
   * @see {@link isDirect} for direct station detection algorithm
   * @see {@link buildRetrogradeEvent} for event formatting
   * @see {@link retrogradeBodies} for list of bodies that can go retrograde
   *
   * @example
   * ```typescript
   * const events = getRetrogradeEvents({
   *   coordinateEphemerisByBody: ephemerides,
   *   currentMinute: moment('2026-03-15T08:30:00Z')
   * });
   * // Returns: [{ summary: "☿ ↩️ Mercury Stationary Retrograde", start: ..., ... }]
   * ```
   */
  detect(args: {
    coordinateEphemerisByBody: Record<RetrogradeBody, CoordinateEphemeris>;
    minute: Moment;
  }): Event[] {
    const { coordinateEphemerisByBody, minute } = args;
    const retrogradeEvents: Event[] = [];
    for (const body of retrogradeBodies) {
      const ephemeris = coordinateEphemerisByBody[body];
      retrogradeEvents.push(
        ...this.detectBodyStations(body, ephemeris, minute),
      );
    }
    return retrogradeEvents;
  }

  /**
   * Generates progressive events showing retrograde periods for each planet.
   *
   * Pairs "Stationary Retrograde" and "Stationary Direct" events for each planet
   * to create progressive events spanning the retrograde period. This shows the full
   * span of time when a planet appears to move backward.
   *
   *
   * @remarks
   * - Filters to events with "Direction" category
   * - Processes each planet separately (retrograde periods don't overlap between planets)
   * - Pairs retrograde stations (beginnings) with direct stations (endings)
   * - Skips unpaired events (e.g., retrograde still active at end of range)
   * - Progressive events use "Retrogrades" category (plural) vs "Retrograde" for stations
   * - Summary format: `[bodySymbol] ↩️ [Body] Retrograde`
   *
   * @see {@link pairProgressiveEvents} for pairing algorithm
   * @see {@link getRetrogradeDurationEvent} for event formatting
   * @see {@link retrogradeBodies} for planets that can go retrograde
   *
   * @example
   * ```typescript
   * const allEvents = [
   *   { description: "Mercury Stationary Retrograde", start: Mar 15, ... },
   *   { description: "Mercury Stationary Direct", start: Apr 8, ... },
   *   { description: "Venus Stationary Retrograde", start: Jul 22, ... },
   *   { description: "Venus Stationary Direct", start: Sep 3, ... }
   * ];
   * const durations = getRetrogradeProgressiveEvents(allEvents);
   * // Returns: [
   * //   { summary: "☿ ↩️ Mercury Retrograde", start: Mar 15, end: Apr 8, ... },
   * //   { summary: "♀ ↩️ Venus Retrograde", start: Jul 22, end: Sep 3, ... }
   * // ]
   * ```
   */
  detectProgressive(events: Event[]): Event[] {
    const progressiveEvents: Event[] = [];

    const retrogradeEvents = events.filter((event) =>
      event.categories.includes("Direction"),
    );

    // Process each planet separately
    for (const planet of retrogradeBodies) {
      const beginnings = retrogradeEvents.filter((event) =>
        event.description.includes(`Retrograde`),
      );
      const endings = retrogradeEvents.filter((event) =>
        event.description.includes(`Direct`),
      );

      const pairs = this.progressiveUtilitiesService.pairProgressiveEvents(
        beginnings,
        endings,
        `${planet} retrograde`,
      );

      progressiveEvents.push(
        ...pairs.map(([beginning, ending]) =>
          this.getRetrogradeProgressiveEvent(beginning, ending, planet),
        ),
      );
    }

    return progressiveEvents;
  }
}
