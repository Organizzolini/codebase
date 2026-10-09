import { Injectable } from "@nestjs/common";
import _ from "lodash";

import { LoggerService } from "@codebase/logging";

import { lunarPhases } from "../caelundas/caelundas.constants";
import { isLunarPhase } from "../caelundas/caelundas.types";
import { symbolByLunarPhase } from "../caelundas/symbol-caelundas.constants";
import { CalendarService } from "../calendar/calendar.service";
import { EphemerisService } from "../ephemeris/ephemeris.service";

import { LunarApsidesService } from "./lunar-apsides.service";
import { ELONGATION_BY_LUNAR_PHASE } from "./monthly-lunar-cycle.constants";

import type { DetectedCalendarEvent } from "../caelundas-database/caelundas-database.types";
import type { LunarPhase } from "../caelundas/caelundas.types";
import type { DistanceEphemeris } from "../ephemeris/ephemeris.types";
import type {
  DetectMonthlyLunarCycleArguments,
  ElongationWindow,
} from "./monthly-lunar-cycle.types";
import type { Moment } from "moment-timezone";

/**
 * Detects the Moon's monthly phases and the spans between them.
 *
 * Every phase is timed by the Moon's elongation from the Sun in ecliptic
 * longitude: the four primary phases at 0°, 90°, 180° and 270°, as USNO and
 * the almanacs time them, and the crescent and gibbous phases at the octants
 * between them, 45°, 135°, 225° and 315°.
 */
@Injectable()
export class MonthlyLunarCycleService {
  // 🏗 Dependency Injection

  constructor(
    private readonly calendarService: CalendarService,
    private readonly logger: LoggerService,
    private readonly ephemerisService: EphemerisService,
    private readonly lunarApsidesService: LunarApsidesService,
  ) {
    this.logger.setContext(MonthlyLunarCycleService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Creates a progressive event from consecutive lunar phase events.
   *
   * Extracts the lunar phase from the entering event categories and formats a
   * progressive event showing the span of time Moon remains in that phase.
   *
   * @remarks
   * - Duration spans from entering.start to exiting.start (not exiting.end)
   * - Extracts phase from categories by matching against {@link lunarPhases}
   * - Returns null and logs warning if phase category is missing or invalid
   * - Summary format: `🌕 [phaseSymbol] [Phase] Moon`
   * - Uses same format as instantaneous phase events for consistency
   * - Categories match entering event categories exactly
   *
   * @see {@link lunarPhases} for extracting phase category
   * @see {@link symbolByLunarPhase} for phase symbols
   *
   * @example
   * ```typescript
   * const duration = getMonthlyLunarCycleProgressiveEvent(
   *   { summary: "🌕 🌑 New Moon", start: Jan 1, categories: [..., "New"] },
   *   { summary: "🌕 🌓 First Quarter Moon", start: Jan 8, categories: [..., "First"] }
   * );
   * // Returns: { summary: "🌕 🌑 New Moon", start: Jan 1, end: Jan 8, categories: [..., "New"] }
   * ```
   */
  private extractLunarPhaseFromCategories(
    categories: string[],
    enteringSummary: string,
  ): LunarPhase | null {
    const capitalizedLunarPhases = new Set(
      lunarPhases.map((phase) => _.startCase(phase)),
    );
    const lunarPhaseCapitalized = categories.find((category) =>
      capitalizedLunarPhases.has(category),
    );
    if (!lunarPhaseCapitalized) {
      this.logger.warn(
        "🌙 Skipping progressive event without a lunar phase",
        undefined,
        { categories, enteringSummary },
      );
      return null;
    }
    const lunarPhaseLower = lunarPhaseCapitalized.toLowerCase();
    if (!isLunarPhase(lunarPhaseLower)) {
      this.logger.warn("🌙 Skipping unknown lunar phase", undefined, {
        lunarPhaseLower,
      });
      return null;
    }
    return lunarPhaseLower;
  }

  /**
   * The Moon's elongation from the Sun, in [0, 360), at a minute: its apparent
   * geocentric ecliptic longitude minus the Sun's.
   */
  private getElongation(args: DetectMonthlyLunarCycleArguments): number {
    const { minute, moonCoordinateEphemeris, sunCoordinateEphemeris } = args;
    const timestamp = minute.toISOString();
    const moonLongitude = this.ephemerisService.getCoordinateFromEphemeris(
      moonCoordinateEphemeris,
      timestamp,
      "longitude",
    );
    const sunLongitude = this.ephemerisService.getCoordinateFromEphemeris(
      sunCoordinateEphemeris,
      timestamp,
      "longitude",
    );
    return (((moonLongitude - sunLongitude) % 360) + 360) % 360;
  }

  /** Samples the Moon's elongation at the previous, current and next minute. */
  private getElongationWindow(
    args: DetectMonthlyLunarCycleArguments,
  ): ElongationWindow {
    const { minute } = args;
    return {
      current: this.getElongation(args),
      next: this.getElongation({
        ...args,
        minute: minute.clone().add(1, "minute"),
      }),
      previous: this.getElongation({
        ...args,
        minute: minute.clone().subtract(1, "minute"),
      }),
    };
  }

  /** Detects which phases begin at this minute, by elongation. */
  private getLunarPhases(args: DetectMonthlyLunarCycleArguments): LunarPhase[] {
    const elongations = this.getElongationWindow(args);
    return lunarPhases.filter((lunarPhase) =>
      this.isElongationReached(
        elongations,
        ELONGATION_BY_LUNAR_PHASE[lunarPhase],
      ),
    );
  }

  /**
   * Derives monthly lunar cycle progressive event.
   */
  private getMonthlyLunarCycleProgressiveEvent(
    entering: DetectedCalendarEvent,
    exiting: DetectedCalendarEvent,
  ): DetectedCalendarEvent | null {
    const categories = entering.categories;
    const lunarPhase = this.extractLunarPhaseFromCategories(
      categories,
      entering.summary,
    );
    if (!lunarPhase) {
      return null;
    }
    const lunarPhaseCapitalized = _.startCase(lunarPhase);
    const lunarPhaseSymbol = symbolByLunarPhase[lunarPhase];
    return {
      categories: [
        "Astronomy",
        "Astrology",
        "Monthly Lunar Cycle",
        "Lunar",
        lunarPhaseCapitalized,
      ],
      description: `${lunarPhaseCapitalized} Moon`,
      end: exiting.start,
      start: entering.start,
      summary: `🌙 ${lunarPhaseSymbol} ${lunarPhaseCapitalized} Moon`,
    };
  }

  /**
   * Determines whether the Moon's elongation reaches `target` nearer this
   * minute than either neighbor.
   *
   * The signed offset from the target, wrapped to [-180, 180), turns from
   * negative to non-negative once per lunation. Of the two minutes either
   * side of that sign change, only the one with the smaller offset reports
   * it, so each phase is stamped exactly once, at the nearest minute.
   */
  private isElongationReached(
    elongations: ElongationWindow,
    target: number,
  ): boolean {
    const offset = (elongation: number): number =>
      ((((elongation - target + 180) % 360) + 360) % 360) - 180;
    const previous = offset(elongations.previous);
    const current = offset(elongations.current);
    const next = offset(elongations.next);
    const reachedSincePrevious =
      previous < 0 && current >= 0 && Math.abs(current) <= Math.abs(previous);
    const reachedBeforeNext =
      current < 0 && next >= 0 && Math.abs(current) < Math.abs(next);
    return reachedSincePrevious || reachedBeforeNext;
  }

  // 🌎 Public Methods

  /**
   * Creates a formatted calendar event for a lunar phase.
   *
   * Generates a calendar event with Unicode Moon phase symbols and descriptive text.
   * Each phase has a unique symbol (🌑 new, 🌓 first, 🌕 full, 🌗 third) for visual
   * distinction in calendar applications.
   *
   * @remarks
   * - Summary format: `🌕 [phaseSymbol] [Phase] Moon`
   * - Example new: "🌕 🌑 New Moon"
   * - Example full: "🌕 🌕 Full Moon"
   * - Phase symbols from {@link symbolByLunarPhase}: 🌑 (new), 🌓 (first), 🌕 (full), 🌗 (third)
   * - Categories include capitalized phase name for filtering (e.g., "New", "Full")
   * - Logs event to console with America/New_York timezone for readability
   * - Event timestamps use UTC but display shows local time in logs
   *
   * @see {@link symbolByLunarPhase} for Moon phase Unicode symbols
   * @see {@link DetectedCalendarEvent} for calendar event structure
   *
   * @example
   * ```typescript
   * const event = getMonthlyLunarCycleEvent({
   *   date: new Date('2026-01-28T20:15:00Z'),
   *   lunarPhase: "full"
   * });
   * // Returns: { summary: "🌕 🌕 Full Moon", start: ..., categories: [..., "Full"], ... }
   * ```
   */
  buildMonthlyLunarCycleEvent(args: {
    date: Moment;
    lunarPhase: LunarPhase;
  }): DetectedCalendarEvent {
    const { date, lunarPhase } = args;

    const lunarPhaseCapitalized = _.startCase(lunarPhase);
    const description = `${lunarPhaseCapitalized} Moon`;
    const summary = `🌙 ${symbolByLunarPhase[lunarPhase]} ${description}`;

    return this.calendarService.buildInstantEvent({
      categories: [
        "Astronomy",
        "Astrology",
        "Monthly Lunar Cycle",
        "Lunar",
        lunarPhaseCapitalized,
      ],
      date,
      description,
      logger: this.logger,
      summary,
      timezone: "America/New_York",
    });
  }

  /**
   * Detects the lunar phases that begin at a minute.
   *
   * A phase begins when the Moon's apparent geocentric ecliptic longitude
   * minus the Sun's reaches its elongation: New 0°, Waxing Crescent 45°,
   * First Quarter 90°, Waxing Gibbous 135°, Full 180°, Waning Gibbous 225°,
   * Last Quarter 270° and Waning Crescent 315°. The four primary phases are
   * the ones USNO and the almanacs publish. Each is stamped at the minute
   * nearest its instant.
   *
   * @example
   * ```typescript
   * const events = service.detect({
   *   minute: moment.utc("2026-10-26T04:12:00Z"),
   *   moonCoordinateEphemeris,
   *   sunCoordinateEphemeris,
   * });
   * // Returns: [{ summary: "🌙 🌕 Full Moon", start: 2026-10-26T04:12Z, ... }]
   * ```
   */
  detect(args: DetectMonthlyLunarCycleArguments): DetectedCalendarEvent[] {
    const { minute } = args;
    return this.getLunarPhases(args).map((lunarPhase) =>
      this.buildMonthlyLunarCycleEvent({ date: minute, lunarPhase }),
    );
  }

  /**
   * Detects a lunar apogee or perigee at a specific minute.
   *
   * @see {@link LunarApsidesService.detect} for the radial-speed test
   */
  detectApsides(args: {
    minute: Moment;
    moonDistanceEphemeris: DistanceEphemeris;
  }): DetectedCalendarEvent[] {
    return this.lunarApsidesService.detect(args);
  }

  /**
   * Generates progressive events showing time spent in each lunar phase.
   *
   * Pairs consecutive lunar phase events to create progressive events spanning the
   * period between phases. This shows how long Moon remains in each phase state
   * (roughly 3.7 days per phase on average).
   *
   * @remarks
   * - Filters to events with "Monthly Lunar Cycle" category
   * - Sorts events chronologically by start time
   * - Pairs consecutive phase events (new → waxing crescent → first quarter → … → waning crescent → new)
   * - Progressive event represents time spent **in** the entering phase
   * - Skips invalid events that lack proper phase categorization
   * - Returns empty array for unpaired events (e.g., at date range boundaries)
   * - Average phase duration: ~3.7 days (29.5 day lunar month ÷ 8 phases)
   *
   * @see {@link getMonthlyLunarCycleDurationEvent} for event formatting
   * @see {@link lunarPhases} for phase ordering
   *
   * @example
   * ```typescript
   * const allEvents = [
   *   { summary: "🌙 🌑 New Moon", start: Oct 10, categories: [..., "New"] },
   *   { summary: "🌙 🌒 Waxing Crescent Moon", start: Oct 14, categories: [..., "Waxing Crescent"] },
   *   { summary: "🌙 🌓 First Quarter Moon", start: Oct 18, categories: [..., "First Quarter"] },
   *   { summary: "🌙 🌔 Waxing Gibbous Moon", start: Oct 22, categories: [..., "Waxing Gibbous"] },
   *   { summary: "🌙 🌕 Full Moon", start: Oct 26, categories: [..., "Full"] },
   *   { summary: "🌙 🌖 Waning Gibbous Moon", start: Oct 29, categories: [..., "Waning Gibbous"] },
   *   { summary: "🌙 🌗 Last Quarter Moon", start: Nov 1, categories: [..., "Last Quarter"] },
   *   { summary: "🌙 🌘 Waning Crescent Moon", start: Nov 5, categories: [..., "Waning Crescent"] },
   * ];
   * const durations = service.detectProgressive(allEvents);
   * // Returns one span per consecutive pair, seven in all:
   * // [
   * //   { summary: "🌙 🌑 New Moon", start: Oct 10, end: Oct 14, ... },
   * //   { summary: "🌙 🌒 Waxing Crescent Moon", start: Oct 14, end: Oct 18, ... },
   * //   ...
   * //   { summary: "🌙 🌗 Last Quarter Moon", start: Nov 1, end: Nov 5, ... }
   * // ]
   * ```
   */
  detectProgressive(events: DetectedCalendarEvent[]): DetectedCalendarEvent[] {
    const progressiveEvents: DetectedCalendarEvent[] = [];

    // Filter to monthly lunar cycle events only
    const lunarCycleEvents = events.filter((event) =>
      event.categories.includes("Monthly Lunar Cycle"),
    );

    // Sort by time
    const sortedEvents = _.sortBy(lunarCycleEvents, (event) =>
      event.start.valueOf(),
    );

    // Pair consecutive lunar phases to create progressive events
    for (let index = 0; index < sortedEvents.length - 1; index++) {
      const entering = sortedEvents[index];
      const exiting = sortedEvents[index + 1];
      if (!entering || !exiting) {
        continue;
      }

      const durationEvent = this.getMonthlyLunarCycleProgressiveEvent(
        entering,
        exiting,
      );
      if (!durationEvent) {
        continue;
      }

      progressiveEvents.push(durationEvent);
    }

    return progressiveEvents;
  }
}
