import { Injectable } from "@nestjs/common";
import _ from "lodash";

import { LoggerService } from "@codebase/logging";

import { lunarPhases } from "../caelundas/caelundas.constants";
import { isLunarPhase } from "../caelundas/caelundas.types";
import { symbolByLunarPhase } from "../caelundas/symbol-caelundas.constants";
import { CalendarService } from "../calendar/calendar.service";
import { EphemerisService } from "../ephemeris/ephemeris.service";

import { ELONGATION_BY_PRIMARY_LUNAR_PHASE } from "./monthly-lunar-cycle.constants";

import type { DetectedCalendarEvent } from "../caelundas-database/caelundas-database.types";
import type { LunarPhase } from "../caelundas/caelundas.types";
import type {
  DetectMonthlyLunarCycleArguments,
  ElongationWindow,
} from "./monthly-lunar-cycle.types";
import type { Moment } from "moment-timezone";

/**
 * Detects the Moon's monthly phases and the spans between them.
 *
 * The four primary phases are timed by the Moon's elongation from the Sun in
 * ecliptic longitude, as USNO and the almanacs time them. The crescent and
 * gibbous phases between them are timed by illumination.
 */
@Injectable()
export class MonthlyLunarCycleService {
  // 🏗 Dependency Injection

  constructor(
    private readonly calendarService: CalendarService,
    private readonly logger: LoggerService,
    private readonly ephemerisService: EphemerisService,
  ) {
    this.logger.setContext(MonthlyLunarCycleService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  static readonly illuminationByPhase: Record<LunarPhase, number> = {
    "first quarter": 0.5,
    full: 1,
    "last quarter": 0.5,
    new: 0,
    "waning crescent": 0.25,
    "waning gibbous": 0.75,
    "waxing crescent": 0.25,
    "waxing gibbous": 0.75,
  };

  /**
   * Lunar phases during which Moon's illumination is decreasing.
   * Used to classify quarter-crossing detections as waning events.
   */
  static readonly waningPhases: ReadonlySet<LunarPhase> = new Set([
    "last quarter",
    "waning crescent",
    "waning gibbous",
  ]);

  /**
   * Lunar phases during which Moon's illumination is increasing.
   * Used to classify quarter-crossing detections as waxing events.
   */
  static readonly waxingPhases: ReadonlySet<LunarPhase> = new Set([
    "first quarter",
    "waxing crescent",
    "waxing gibbous",
  ]);

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
  private getElongation(
    args: Omit<DetectMonthlyLunarCycleArguments, "moonIlluminationEphemeris">,
  ): number {
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

  /** Detects which intermediate phases begin at this minute, by illumination. */
  private getIntermediatePhases(
    args: DetectMonthlyLunarCycleArguments,
  ): LunarPhase[] {
    const { minute, moonIlluminationEphemeris } = args;
    const currentIllumination =
      this.ephemerisService.getIlluminationFromEphemeris(
        moonIlluminationEphemeris,
        minute.toISOString(),
        "currentIllumination",
      );
    const previousIllumination =
      this.ephemerisService.getIlluminationFromEphemeris(
        moonIlluminationEphemeris,
        minute.clone().subtract(1, "minute").toISOString(),
        "previousIllumination",
      );
    return lunarPhases.filter(
      (lunarPhase) =>
        !this.isPrimaryLunarPhase(lunarPhase) &&
        this.isIntermediatePhase({
          currentIllumination,
          lunarPhase,
          previousIllumination,
        }),
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

  /** Detects which primary phases begin at this minute, by elongation. */
  private getPrimaryPhases(
    args: DetectMonthlyLunarCycleArguments,
  ): LunarPhase[] {
    const elongations = this.getElongationWindow(args);
    return lunarPhases.filter(
      (lunarPhase) =>
        this.isPrimaryLunarPhase(lunarPhase) &&
        this.isElongationReached(
          elongations,
          ELONGATION_BY_PRIMARY_LUNAR_PHASE[lunarPhase],
        ),
    );
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

  /**
   * Determines whether an intermediate (crescent or gibbous) phase begins,
   * by the Moon's illumination crossing that phase's threshold.
   */
  private isIntermediatePhase(args: {
    currentIllumination: number;
    lunarPhase: LunarPhase;
    previousIllumination: number;
  }): boolean {
    const { currentIllumination, lunarPhase, previousIllumination } = args;
    const illumination =
      MonthlyLunarCycleService.illuminationByPhase[lunarPhase] * 100;
    const isWaxing = currentIllumination > previousIllumination;
    const isWaning = currentIllumination < previousIllumination;
    const isCrossingUp =
      currentIllumination > illumination &&
      previousIllumination <= illumination;
    const isCrossingDown =
      currentIllumination < illumination &&
      previousIllumination >= illumination;
    const isPhase = isCrossingUp || isCrossingDown;
    if (MonthlyLunarCycleService.waxingPhases.has(lunarPhase)) {
      return isPhase && isWaxing;
    }
    if (MonthlyLunarCycleService.waningPhases.has(lunarPhase)) {
      return isPhase && isWaning;
    }
    return false;
  }

  /** Narrows a lunar phase to the four primary phases timed by elongation. */
  private isPrimaryLunarPhase(
    lunarPhase: LunarPhase,
  ): lunarPhase is keyof typeof ELONGATION_BY_PRIMARY_LUNAR_PHASE {
    return lunarPhase in ELONGATION_BY_PRIMARY_LUNAR_PHASE;
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
   * New, First Quarter, Full and Last Quarter Moon begin when the Moon's
   * apparent geocentric ecliptic longitude minus the Sun's reaches 0°, 90°,
   * 180° and 270°, the definition USNO and the almanacs publish. Each is
   * stamped at the minute nearest that instant.
   *
   * @example
   * ```typescript
   * const events = service.detect({
   *   minute: moment.utc("2026-10-26T04:12:00Z"),
   *   moonCoordinateEphemeris,
   *   moonIlluminationEphemeris,
   *   sunCoordinateEphemeris,
   * });
   * // Returns: [{ summary: "🌙 🌕 Full Moon", start: 2026-10-26T04:12Z, ... }]
   * ```
   */
  detect(args: DetectMonthlyLunarCycleArguments): DetectedCalendarEvent[] {
    const { minute } = args;
    return [
      ...this.getPrimaryPhases(args),
      ...this.getIntermediatePhases(args),
    ].map((lunarPhase) =>
      this.buildMonthlyLunarCycleEvent({ date: minute, lunarPhase }),
    );
  }

  /**
   * Generates progressive events showing time spent in each lunar phase.
   *
   * Pairs consecutive lunar phase events to create progressive events spanning the
   * period between phases. This shows how long Moon remains in each phase state
   * (roughly 7.4 days per phase on average).
   *
   * @remarks
   * - Filters to events with "Monthly Lunar Cycle" category
   * - Sorts events chronologically by start time
   * - Pairs consecutive phase events (new → first, first → full, full → third, third → new)
   * - Progressive event represents time spent **in** the entering phase
   * - Skips invalid events that lack proper phase categorization
   * - Returns empty array for unpaired events (e.g., at date range boundaries)
   * - Average phase duration: ~7.4 days (29.5 day lunar month ÷ 4 phases)
   *
   * @see {@link getMonthlyLunarCycleDurationEvent} for event formatting
   * @see {@link lunarPhases} for phase ordering
   *
   * @example
   * ```typescript
   * const allEvents = [
   *   { summary: "🌕 🌑 New Moon", start: Jan 1, categories: [..., "New"] },
   *   { summary: "🌕 🌓 First Quarter Moon", start: Jan 8, categories: [..., "First"] },
   *   { summary: "🌕 🌕 Full Moon", start: Jan 15, categories: [..., "Full"] },
   *   { summary: "🌕 🌗 Third Quarter Moon", start: Jan 22, categories: [..., "Third"] }
   * ];
   * const durations = getMonthlyLunarCycleProgressiveEvents(allEvents);
   * // Returns: [
   * //   { summary: "🌕 🌑 New Moon", start: Jan 1, end: Jan 8, ... },
   * //   { summary: "🌕 🌓 First Quarter Moon", start: Jan 8, end: Jan 15, ... },
   * //   { summary: "🌕 🌕 Full Moon", start: Jan 15, end: Jan 22, ... }
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
