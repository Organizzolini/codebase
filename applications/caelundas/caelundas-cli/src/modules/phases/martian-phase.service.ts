import { Injectable } from "@nestjs/common";
import _ from "lodash";

import { LoggerService } from "@codebase/logger";

import { symbolByMartianPhase } from "../caelundas/symbol-caelundas.constants";
import { ProgressiveUtilitiesService } from "../progressive/progressive-utilities.service";

import { PhaseCalculationService } from "./phase-calculation.service";
import {
  EVENING_RISE_CATEGORY,
  EVENING_SET_CATEGORY,
  MARS_EVENING_VISIBILITY_DESCRIPTION,
  MARS_EVENING_VISIBILITY_PAIR_LABEL,
  MARS_EVENING_VISIBILITY_SUMMARY,
  MARS_MORNING_VISIBILITY_DESCRIPTION,
  MARS_MORNING_VISIBILITY_PAIR_LABEL,
  MARS_MORNING_VISIBILITY_SUMMARY,
  MARTIAN_CATEGORY,
  MORNING_RISE_CATEGORY,
  MORNING_SET_CATEGORY,
  PHASE_EVENT_BASE_CATEGORIES,
  PHASE_EVENT_TIMEZONE,
} from "./phases.constants";

import type { MartianPhase } from "../caelundas/caelundas.types";
import type { Event } from "../calendar/calendar.types";
import type {
  BuildPlanetPhaseEventArguments,
  MartianPhaseEventArguments,
  PhaseParameters,
} from "./phases.types";
import type { Moment } from "moment-timezone";

/**
 * Detects Martian phase transitions and visibility events.
 */
@Injectable()
export class MartianPhaseService {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly phaseCalculationService: PhaseCalculationService,
    private readonly progressiveUtilitiesService: ProgressiveUtilitiesService,
  ) {
    this.logger.setContext(MartianPhaseService.name);
  }

  // 🔐 Private Fields

  private static readonly categories = PHASE_EVENT_BASE_CATEGORIES;

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Detects martian phases.
   */
  private detectMartianPhases(
    parameters: PhaseParameters,
    minute: Moment,
  ): Event[] {
    const events: Event[] = [];
    const checks: [boolean, MartianPhase][] = [
      [this.phaseCalculationService.isMorningRise(parameters), "morning rise"],
      [this.phaseCalculationService.isMorningSet(parameters), "morning set"],
      [this.phaseCalculationService.isEveningRise(parameters), "evening rise"],
      [this.phaseCalculationService.isEveningSet(parameters), "evening set"],
    ];
    for (const [condition, phase] of checks) {
      if (condition) {
        events.push(this.buildMartianPhaseEvent({ phase, timestamp: minute }));
      }
    }
    return events;
  }

  // 🌎 Public Methods

  /**
   * Creates a calendar event for a specific Martian phase.
   *
   * Mars, being an outer planet, has a simpler phase cycle than Venus/Mercury:
   * - Morning Rise: Mars becomes visible before sunrise
   * - Morning Set: Mars sets with the Sun (approaching conjunction)
   * - Evening Rise: Mars becomes visible after sunset
   * - Evening Set: Mars disappears into Sun's glare (conjunction).
   *
   * Mars doesn't have elongation or brightness maxima like inner planets
   * because it can appear at any angular distance from the Sun (up to 180°
   * at opposition).
   *
   * @see {@link symbolByMartianPhase} for phase symbols
   */
  buildMartianPhaseEvent(
    args: BuildPlanetPhaseEventArguments<MartianPhase>,
  ): Event {
    const { phase, timestamp } = args;

    const phaseCapitalized = _.startCase(phase);
    const phaseSymbol = symbolByMartianPhase[phase];

    const description = `Mars ${phaseCapitalized}`;
    const summary = `♂️${phaseSymbol} ${description}`;

    const dateString = this.phaseCalculationService.formatTimeZoneIso(
      timestamp,
      PHASE_EVENT_TIMEZONE,
    );
    this.logger.info("🗓️ Built a calendar event", undefined, {
      at: dateString,
      summary,
    });

    const martianPhaseEvent: Event = {
      categories: [
        ...MartianPhaseService.categories,
        MARTIAN_CATEGORY,
        phaseCapitalized,
      ],
      description,
      end: timestamp,
      start: timestamp,
      summary,
    };
    return martianPhaseEvent;
  }

  /**
   * Derives mars evening visibility duration event.
   */
  getMarsEveningVisibilityDurationEvent(
    beginning: Event,
    ending: Event,
  ): Event {
    return {
      categories: [
        ...MartianPhaseService.categories,
        MARTIAN_CATEGORY,
        "Evening Visibility",
      ],
      description: MARS_EVENING_VISIBILITY_DESCRIPTION,
      end: ending.start,
      start: beginning.start,
      summary: MARS_EVENING_VISIBILITY_SUMMARY,
    };
  }

  /**
   * Derives mars morning visibility duration event.
   */
  getMarsMorningVisibilityDurationEvent(
    beginning: Event,
    ending: Event,
  ): Event {
    return {
      categories: [
        ...MartianPhaseService.categories,
        MARTIAN_CATEGORY,
        "Morning Visibility",
      ],
      description: MARS_MORNING_VISIBILITY_DESCRIPTION,
      end: ending.start,
      start: beginning.start,
      summary: MARS_MORNING_VISIBILITY_SUMMARY,
    };
  }

  /**
   * Derives martian evening progressive events.
   */
  getMartianEveningProgressiveEvents(events: Event[]): Event[] {
    const pairs = this.progressiveUtilitiesService.pairProgressiveEvents(
      this.phaseCalculationService.filterByCategory(
        events,
        EVENING_RISE_CATEGORY,
      ),
      this.phaseCalculationService.filterByCategory(
        events,
        EVENING_SET_CATEGORY,
      ),
      MARS_EVENING_VISIBILITY_PAIR_LABEL,
    );
    return pairs.map(([beginning, ending]) =>
      this.getMarsEveningVisibilityDurationEvent(beginning, ending),
    );
  }

  /**
   * Derives martian morning progressive events.
   */
  getMartianMorningProgressiveEvents(events: Event[]): Event[] {
    const pairs = this.progressiveUtilitiesService.pairProgressiveEvents(
      this.phaseCalculationService.filterByCategory(
        events,
        MORNING_RISE_CATEGORY,
      ),
      this.phaseCalculationService.filterByCategory(
        events,
        MORNING_SET_CATEGORY,
      ),
      MARS_MORNING_VISIBILITY_PAIR_LABEL,
    );
    return pairs.map(([beginning, ending]) =>
      this.getMarsMorningVisibilityDurationEvent(beginning, ending),
    );
  }

  /**
   * Produces Martian phase events for one minute using precomputed phase parameters.
   */
  getMartianPhaseEvents(args: MartianPhaseEventArguments): Event[] {
    const {
      marsCoordinateEphemeris,
      marsDistanceEphemeris,
      marsIlluminationEphemeris,
      minute,
      sunCoordinateEphemeris,
    } = args;

    const parameters = this.phaseCalculationService.gatherPhaseParameters({
      distanceEphemeris: marsDistanceEphemeris,
      illuminationEphemeris: marsIlluminationEphemeris,
      minute,
      planetCoordinateEphemeris: marsCoordinateEphemeris,
      sunCoordinateEphemeris,
    });

    return this.detectMartianPhases(parameters, minute);
  }

  /**
   * Derives martian phase progressive events.
   */
  getMartianPhaseProgressiveEvents(events: Event[]): Event[] {
    return [
      ...this.getMartianMorningProgressiveEvents(events),
      ...this.getMartianEveningProgressiveEvents(events),
    ];
  }
}
