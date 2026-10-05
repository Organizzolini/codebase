import { Injectable } from "@nestjs/common";
import _ from "lodash";

import { LoggerService } from "@codebase/logger";

import { symbolByMercurianPhase } from "../caelundas/symbol-caelundas.constants";
import { ProgressiveUtilitiesService } from "../progressive/progressive-utilities.service";

import { PhaseCalculationService } from "./phase-calculation.service";
import {
  EVENING_RISE_CATEGORY,
  EVENING_SET_CATEGORY,
  MERCURIAN_CATEGORY,
  MERCURY_EVENING_VISIBILITY_DESCRIPTION,
  MERCURY_EVENING_VISIBILITY_PAIR_LABEL,
  MERCURY_EVENING_VISIBILITY_SUMMARY,
  MERCURY_MORNING_VISIBILITY_DESCRIPTION,
  MERCURY_MORNING_VISIBILITY_PAIR_LABEL,
  MERCURY_MORNING_VISIBILITY_SUMMARY,
  MORNING_RISE_CATEGORY,
  MORNING_SET_CATEGORY,
  PHASE_EVENT_BASE_CATEGORIES,
  PHASE_EVENT_TIMEZONE,
} from "./phases.constants";

import type { MercurianPhase } from "../caelundas/caelundas.types";
import type { Event } from "../calendar/calendar.types";
import type {
  BuildPlanetPhaseEventArguments,
  MercurianPhaseEventArguments,
  PhaseParameters,
} from "./phases.types";
import type { Moment } from "moment-timezone";

/**
 * Detects Mercurian phase transitions and visibility events.
 */
@Injectable()
export class MercurianPhaseService {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly phaseCalculationService: PhaseCalculationService,
    private readonly progressiveUtilitiesService: ProgressiveUtilitiesService,
  ) {
    this.logger.setContext(MercurianPhaseService.name);
  }

  // 🔐 Private Fields

  private static readonly categories = PHASE_EVENT_BASE_CATEGORIES;

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Detects mercurian evening phases.
   */
  private detectMercurianEveningPhases(
    parameters: PhaseParameters,
    minute: Moment,
  ): Event[] {
    const events: Event[] = [];
    const checks: [boolean, MercurianPhase][] = [
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
        events.push(
          this.buildMercurianPhaseEvent({ phase, timestamp: minute }),
        );
      }
    }
    return events;
  }

  /**
   * Detects mercurian morning phases.
   */
  private detectMercurianMorningPhases(
    parameters: PhaseParameters,
    minute: Moment,
  ): Event[] {
    const events: Event[] = [];
    const checks: [boolean, MercurianPhase][] = [
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
        events.push(
          this.buildMercurianPhaseEvent({ phase, timestamp: minute }),
        );
      }
    }
    return events;
  }

  // 🌎 Public Methods

  /**
   * Creates a calendar event for a specific Mercurian phase.
   *
   * Mercury exhibits an 8-phase cycle similar to Venus but with shorter duration
   * due to its faster orbit (88 days vs 225 days):
   * - Morning Rise: Mercury becomes visible before sunrise
   * - Western Brightest: Maximum brilliance as morning star
   * - Western Elongation: Greatest angular distance west of Sun (max 28°)
   * - Morning Set: Mercury sets with the Sun
   * - Evening Rise: Mercury becomes visible after sunset
   * - Eastern Elongation: Greatest angular distance east of Sun (max 28°)
   * - Eastern Brightest: Maximum brilliance as evening star
   * - Evening Set: Mercury disappears into Sun's glare.
   *
   * @see {@link symbolByMercurianPhase} for phase symbols
   */
  buildMercurianPhaseEvent(
    args: BuildPlanetPhaseEventArguments<MercurianPhase>,
  ): Event {
    const { phase, timestamp } = args;

    const phaseCapitalized = _.startCase(phase);
    const phaseSymbol = symbolByMercurianPhase[phase];

    const description = `Mercury ${phaseCapitalized}`;
    const summary = `☿${phaseSymbol} ${description}`;

    const dateString = this.phaseCalculationService.formatTimeZoneIso(
      timestamp,
      PHASE_EVENT_TIMEZONE,
    );
    this.logger.info("🗓️ Built a calendar event", undefined, {
      at: dateString,
      summary,
    });

    const mercurianPhaseEvent: Event = {
      categories: [
        ...MercurianPhaseService.categories,
        MERCURIAN_CATEGORY,
        phaseCapitalized,
      ],
      description,
      end: timestamp,
      start: timestamp,
      summary,
    };
    return mercurianPhaseEvent;
  }

  /**
   * Derives mercurian evening progressive events.
   */
  getMercurianEveningProgressiveEvents(events: Event[]): Event[] {
    const pairs = this.progressiveUtilitiesService.pairProgressiveEvents(
      this.phaseCalculationService.filterByCategory(
        events,
        EVENING_RISE_CATEGORY,
      ),
      this.phaseCalculationService.filterByCategory(
        events,
        EVENING_SET_CATEGORY,
      ),
      MERCURY_EVENING_VISIBILITY_PAIR_LABEL,
    );
    return pairs.map(([beginning, ending]) =>
      this.getMercuryEveningVisibilityDurationEvent(beginning, ending),
    );
  }

  /**
   * Derives mercurian morning progressive events.
   */
  getMercurianMorningProgressiveEvents(events: Event[]): Event[] {
    const pairs = this.progressiveUtilitiesService.pairProgressiveEvents(
      this.phaseCalculationService.filterByCategory(
        events,
        MORNING_RISE_CATEGORY,
      ),
      this.phaseCalculationService.filterByCategory(
        events,
        MORNING_SET_CATEGORY,
      ),
      MERCURY_MORNING_VISIBILITY_PAIR_LABEL,
    );
    return pairs.map(([beginning, ending]) =>
      this.getMercuryMorningVisibilityDurationEvent(beginning, ending),
    );
  }

  /**
   * Produces Mercurian morning/evening phase events for one minute.
   */
  getMercurianPhaseEvents(args: MercurianPhaseEventArguments): Event[] {
    const {
      mercuryCoordinateEphemeris,
      mercuryDistanceEphemeris,
      mercuryIlluminationEphemeris,
      minute,
      sunCoordinateEphemeris,
    } = args;

    const parameters = this.phaseCalculationService.gatherPhaseParameters({
      distanceEphemeris: mercuryDistanceEphemeris,
      illuminationEphemeris: mercuryIlluminationEphemeris,
      minute,
      planetCoordinateEphemeris: mercuryCoordinateEphemeris,
      sunCoordinateEphemeris,
    });

    return [
      ...this.detectMercurianMorningPhases(parameters, minute),
      ...this.detectMercurianEveningPhases(parameters, minute),
    ];
  }

  /**
   * Derives mercurian phase progressive events.
   */
  getMercurianPhaseProgressiveEvents(events: Event[]): Event[] {
    return [
      ...this.getMercurianMorningProgressiveEvents(events),
      ...this.getMercurianEveningProgressiveEvents(events),
    ];
  }

  /**
   * Derives mercury evening visibility duration event.
   */
  getMercuryEveningVisibilityDurationEvent(
    beginning: Event,
    ending: Event,
  ): Event {
    return {
      categories: [
        ...MercurianPhaseService.categories,
        MERCURIAN_CATEGORY,
        "Evening Visibility",
      ],
      description: MERCURY_EVENING_VISIBILITY_DESCRIPTION,
      end: ending.start,
      start: beginning.start,
      summary: MERCURY_EVENING_VISIBILITY_SUMMARY,
    };
  }

  /**
   * Derives mercury morning visibility duration event.
   */
  getMercuryMorningVisibilityDurationEvent(
    beginning: Event,
    ending: Event,
  ): Event {
    return {
      categories: [
        ...MercurianPhaseService.categories,
        MERCURIAN_CATEGORY,
        "Morning Visibility",
      ],
      description: MERCURY_MORNING_VISIBILITY_DESCRIPTION,
      end: ending.start,
      start: beginning.start,
      summary: MERCURY_MORNING_VISIBILITY_SUMMARY,
    };
  }
}
