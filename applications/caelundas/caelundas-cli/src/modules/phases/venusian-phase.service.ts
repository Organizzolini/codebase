import { Injectable } from "@nestjs/common";
import _ from "lodash";

import { LoggerService } from "@codebase/logger";

import { symbolByVenusianPhase } from "../caelundas/symbol-caelundas.constants";
import { ProgressiveUtilitiesService } from "../progressive/progressive-utilities.service";

import { PhaseCalculationService } from "./phase-calculation.service";
import {
  EVENING_RISE_CATEGORY,
  EVENING_SET_CATEGORY,
  MORNING_RISE_CATEGORY,
  MORNING_SET_CATEGORY,
  PHASE_EVENT_BASE_CATEGORIES,
  PHASE_EVENT_TIMEZONE,
  VENUS_EVENING_VISIBILITY_DESCRIPTION,
  VENUS_EVENING_VISIBILITY_PAIR_LABEL,
  VENUS_EVENING_VISIBILITY_SUMMARY,
  VENUS_MORNING_VISIBILITY_DESCRIPTION,
  VENUS_MORNING_VISIBILITY_PAIR_LABEL,
  VENUS_MORNING_VISIBILITY_SUMMARY,
  VENUSIAN_CATEGORY,
} from "./phases.constants";

import type { VenusianPhase } from "../caelundas/caelundas.types";
import type { Event } from "../calendar/calendar.types";
import type {
  BuildPlanetPhaseEventArguments,
  PhaseParameters,
  VenusianPhaseEventArguments,
} from "./phases.types";
import type { Moment } from "moment-timezone";

/**
 * Detects Venusian phase transitions and visibility events.
 */
@Injectable()
export class VenusianPhaseService {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly phaseCalculationService: PhaseCalculationService,
    private readonly progressiveUtilitiesService: ProgressiveUtilitiesService,
  ) {
    this.logger.setContext(VenusianPhaseService.name);
  }

  // 🔐 Private Fields

  private static readonly categories = PHASE_EVENT_BASE_CATEGORIES;

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Detects venusian evening phases.
   */
  private detectVenusianEveningPhases(
    parameters: PhaseParameters,
    minute: Moment,
  ): Event[] {
    const events: Event[] = [];
    const checks: [boolean, VenusianPhase][] = [
      [this.phaseCalculationService.isEveningRise(parameters), "evening rise"],
      [
        this.phaseCalculationService.isEasternElongation(parameters),
        "eastern elongation",
      ],
      [
        this.phaseCalculationService.isEasternBrightest(parameters),
        "eastern brightest",
      ],
      [this.phaseCalculationService.isEveningSet(parameters), "evening set"],
    ];
    for (const [condition, phase] of checks) {
      if (condition) {
        events.push(this.buildVenusianPhaseEvent({ phase, timestamp: minute }));
      }
    }
    return events;
  }

  /**
   * Detects venusian morning phases.
   */
  private detectVenusianMorningPhases(
    parameters: PhaseParameters,
    minute: Moment,
  ): Event[] {
    const events: Event[] = [];
    const checks: [boolean, VenusianPhase][] = [
      [this.phaseCalculationService.isMorningRise(parameters), "morning rise"],
      [
        this.phaseCalculationService.isWesternBrightest(parameters),
        "western brightest",
      ],
      [
        this.phaseCalculationService.isWesternElongation(parameters),
        "western elongation",
      ],
      [this.phaseCalculationService.isMorningSet(parameters), "morning set"],
    ];
    for (const [condition, phase] of checks) {
      if (condition) {
        events.push(this.buildVenusianPhaseEvent({ phase, timestamp: minute }));
      }
    }
    return events;
  }

  // 🌎 Public Methods

  /**
   * Creates a calendar event for a specific Venusian phase.
   *
   * Venus exhibits an 8-phase cycle as it orbits the Sun:
   * - Morning Rise: Venus becomes visible before sunrise
   * - Western Brightest: Maximum brilliance as morning star
   * - Western Elongation: Greatest angular distance west of Sun
   * - Morning Set: Venus sets with the Sun (superior conjunction approaching)
   * - Evening Rise: Venus becomes visible after sunset
   * - Eastern Elongation: Greatest angular distance east of Sun
   * - Eastern Brightest: Maximum brilliance as evening star
   * - Evening Set: Venus disappears into Sun's glare (inferior conjunction).
   *
   * @see {@link symbolByVenusianPhase} for phase symbols
   */
  buildVenusianPhaseEvent(
    args: BuildPlanetPhaseEventArguments<VenusianPhase>,
  ): Event {
    const { phase, timestamp } = args;

    const phaseCapitalized = _.startCase(phase);
    const phaseSymbol = symbolByVenusianPhase[phase];

    const description = `Venus ${phaseCapitalized}`;
    const summary = `♀️${phaseSymbol} ${description}`;

    const dateString = this.phaseCalculationService.formatTimeZoneIso(
      timestamp,
      PHASE_EVENT_TIMEZONE,
    );
    this.logger.info("🗓️ Built a calendar event", undefined, {
      at: dateString,
      summary,
    });

    const venusianPhaseEvent: Event = {
      categories: [
        ...VenusianPhaseService.categories,
        VENUSIAN_CATEGORY,
        phaseCapitalized,
      ],
      description,
      end: timestamp,
      start: timestamp,
      summary,
    };
    return venusianPhaseEvent;
  }

  /**
   * Derives venus evening visibility duration event.
   */
  getVenusEveningVisibilityDurationEvent(
    beginning: Event,
    ending: Event,
  ): Event {
    return {
      categories: [
        ...VenusianPhaseService.categories,
        VENUSIAN_CATEGORY,
        "Evening Visibility",
      ],
      description: VENUS_EVENING_VISIBILITY_DESCRIPTION,
      end: ending.start,
      start: beginning.start,
      summary: VENUS_EVENING_VISIBILITY_SUMMARY,
    };
  }

  /**
   * Derives venusian evening progressive events.
   */
  getVenusianEveningProgressiveEvents(events: Event[]): Event[] {
    const pairs = this.progressiveUtilitiesService.pairProgressiveEvents(
      this.phaseCalculationService.filterByCategory(
        events,
        EVENING_RISE_CATEGORY,
      ),
      this.phaseCalculationService.filterByCategory(
        events,
        EVENING_SET_CATEGORY,
      ),
      VENUS_EVENING_VISIBILITY_PAIR_LABEL,
    );
    return pairs.map(([beginning, ending]) =>
      this.getVenusEveningVisibilityDurationEvent(beginning, ending),
    );
  }

  /**
   * Derives venusian morning progressive events.
   */
  getVenusianMorningProgressiveEvents(events: Event[]): Event[] {
    const pairs = this.progressiveUtilitiesService.pairProgressiveEvents(
      this.phaseCalculationService.filterByCategory(
        events,
        MORNING_RISE_CATEGORY,
      ),
      this.phaseCalculationService.filterByCategory(
        events,
        MORNING_SET_CATEGORY,
      ),
      VENUS_MORNING_VISIBILITY_PAIR_LABEL,
    );
    return pairs.map(([beginning, ending]) =>
      this.getVenusMorningVisibilityDurationEvent(beginning, ending),
    );
  }

  /**
   * Produces Venusian morning/evening phase events for one minute.
   */
  getVenusianPhaseEvents(args: VenusianPhaseEventArguments): Event[] {
    const {
      minute,
      sunCoordinateEphemeris,
      venusCoordinateEphemeris,
      venusDistanceEphemeris,
      venusIlluminationEphemeris,
    } = args;

    const parameters = this.phaseCalculationService.gatherPhaseParameters({
      distanceEphemeris: venusDistanceEphemeris,
      illuminationEphemeris: venusIlluminationEphemeris,
      minute,
      planetCoordinateEphemeris: venusCoordinateEphemeris,
      sunCoordinateEphemeris,
    });

    return [
      ...this.detectVenusianMorningPhases(parameters, minute),
      ...this.detectVenusianEveningPhases(parameters, minute),
    ];
  }

  /**
   * Derives venusian phase progressive events.
   */
  getVenusianPhaseProgressiveEvents(events: Event[]): Event[] {
    return [
      ...this.getVenusianMorningProgressiveEvents(events),
      ...this.getVenusianEveningProgressiveEvents(events),
    ];
  }

  /**
   * Derives venus morning visibility duration event.
   */
  getVenusMorningVisibilityDurationEvent(
    beginning: Event,
    ending: Event,
  ): Event {
    return {
      categories: [
        ...VenusianPhaseService.categories,
        VENUSIAN_CATEGORY,
        "Morning Visibility",
      ],
      description: VENUS_MORNING_VISIBILITY_DESCRIPTION,
      end: ending.start,
      start: beginning.start,
      summary: VENUS_MORNING_VISIBILITY_SUMMARY,
    };
  }
}
