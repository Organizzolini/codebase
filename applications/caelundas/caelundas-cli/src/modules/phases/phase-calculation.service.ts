import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import { MARGIN_MINUTES } from "../caelundas/caelundas.constants";
import { EphemerisService } from "../ephemeris/ephemeris.service";
import { MathService } from "../math/math.service";

import {
  MAXIMUM_BRILLIANCY_PHASE_ANGLE_DEGREES,
  RISE_SET_ELONGATION_DEGREES,
} from "./phases.constants";

import type { DetectedCalendarEvent } from "../caelundas-database/caelundas-database.types";
import type {
  CoordinateEphemeris,
  Coordinates,
} from "../ephemeris/ephemeris.types";
import type {
  BrightnessesArguments,
  BrightnessLongitudeArguments,
  CurrentLongitudeArguments,
  ElongationLongitudeArguments,
  GatherCurrentEphemerisArguments,
  GatheredPositions,
  GatherMarginEphemerisArguments,
  GatherPhaseParametersArguments,
  GatherPositionsArguments,
  MarginEphemerisSample,
  PhaseParameters,
  RiseSetLongitudeArguments,
} from "./phases.types";
import type { Moment } from "moment-timezone";

/**
 * Provides shared phase calculation helpers for brightness, position checks, and ephemeris gathering.
 */
@Injectable()
export class PhaseCalculationService {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly ephemerisService: EphemerisService,
    private readonly mathService: MathService,
  ) {
    this.logger.setContext(PhaseCalculationService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Reads the planet's and sun's ecliptic latitude and longitude at one timestamp.
   */
  private gatherPositions(args: GatherPositionsArguments): GatheredPositions {
    const { planetCoordinateEphemeris, sunCoordinateEphemeris, timestamp } =
      args;
    const read = (
      ephemeris: CoordinateEphemeris,
      coordinate: "latitude" | "longitude",
    ): number =>
      this.ephemerisService.getCoordinateFromEphemeris(
        ephemeris,
        timestamp,
        coordinate,
      );
    return {
      latitudePlanet: read(planetCoordinateEphemeris, "latitude"),
      latitudeSun: read(sunCoordinateEphemeris, "latitude"),
      longitudePlanet: read(planetCoordinateEphemeris, "longitude"),
      longitudeSun: read(sunCoordinateEphemeris, "longitude"),
    };
  }

  /**
   * Derives the signed elongation of the planet from the Sun, in (−180°, 180°].
   *
   * Positive means the planet lies east of the Sun (ahead of it in
   * longitude), negative west. The difference is wrapped, so a planet at 4°
   * Aries is 6° east of a Sun at 28° Pisces rather than 354° west of it.
   */
  private getSignedElongation(args: CurrentLongitudeArguments): number {
    const difference =
      this.mathService.normalizeDegrees(
        args.currentLongitudePlanet - args.currentLongitudeSun + 180,
      ) - 180;
    return difference === -180 ? 180 : difference;
  }

  // 🌎 Public Methods

  /**
   * Filters events by category.
   */
  filterByCategory(
    events: DetectedCalendarEvent[],
    category: string,
  ): DetectedCalendarEvent[] {
    return events.filter((event) => event.categories.includes(category));
  }

  /**
   * Formats date as ISO string in specified timezone.
   */
  formatTimeZoneIso(date: Moment, timezone: string): string {
    return date.clone().tz(timezone).toISOString(true);
  }

  /**
   * Gathers current ephemeris values for brightness and position calculations.
   */
  gatherCurrentEphemeris(
    args: GatherCurrentEphemerisArguments,
  ): Pick<
    PhaseParameters,
    | "currentLatitudePlanet"
    | "currentLatitudeSun"
    | "currentLongitudePlanet"
    | "currentLongitudeSun"
    | "currentMagnitude"
    | "currentPhaseAngle"
  > {
    const {
      illuminationEphemeris,
      isoNow,
      planetCoordinateEphemeris,
      sunCoordinateEphemeris,
    } = args;
    const position = this.gatherPositions({
      planetCoordinateEphemeris,
      sunCoordinateEphemeris,
      timestamp: isoNow,
    });
    return {
      currentLatitudePlanet: position.latitudePlanet,
      currentLatitudeSun: position.latitudeSun,
      currentLongitudePlanet: position.longitudePlanet,
      currentLongitudeSun: position.longitudeSun,
      currentMagnitude: this.ephemerisService.getMagnitudeFromEphemeris(
        illuminationEphemeris,
        isoNow,
        "currentMagnitude",
      ),
      currentPhaseAngle: this.ephemerisService.getPhaseAngleFromEphemeris(
        illuminationEphemeris,
        isoNow,
        "currentPhaseAngle",
      ),
    };
  }

  /**
   * Gathers the margin of apparent magnitudes before or after the minute,
   * for brightness extrema detection.
   */
  gatherMarginEphemeris(
    args: GatherMarginEphemerisArguments,
  ): MarginEphemerisSample {
    const { direction, illuminationEphemeris, minute } = args;

    const magnitudes = Array.from(
      { length: MARGIN_MINUTES },
      (_index, index) => {
        const m =
          direction === "previous"
            ? minute.clone().subtract(MARGIN_MINUTES - index, "minutes")
            : minute.clone().add(index + 1, "minute");
        return this.ephemerisService.getMagnitudeFromEphemeris(
          illuminationEphemeris,
          m.toISOString(),
          `${direction}Magnitude`,
        );
      },
    );
    return { magnitudes };
  }

  /**
   * Gathers complete phase parameters including longitudes and margin samples.
   */
  gatherPhaseParameters(args: GatherPhaseParametersArguments): PhaseParameters {
    const {
      illuminationEphemeris,
      minute,
      planetCoordinateEphemeris,
      sunCoordinateEphemeris,
    } = args;
    const isoNow = minute.toISOString();
    const isoPrevious = minute.clone().subtract(1, "minute").toISOString();
    const isoNext = minute.clone().add(1, "minute").toISOString();
    const current = this.gatherCurrentEphemeris({
      illuminationEphemeris,
      isoNow,
      planetCoordinateEphemeris,
      sunCoordinateEphemeris,
    });
    const previous = this.gatherMarginEphemeris({
      direction: "previous",
      illuminationEphemeris,
      minute,
    });
    const next = this.gatherMarginEphemeris({
      direction: "next",
      illuminationEphemeris,
      minute,
    });
    const nextPosition = this.gatherPositions({
      planetCoordinateEphemeris,
      sunCoordinateEphemeris,
      timestamp: isoNext,
    });
    const previousPosition = this.gatherPositions({
      planetCoordinateEphemeris,
      sunCoordinateEphemeris,
      timestamp: isoPrevious,
    });
    return {
      ...current,
      nextLatitudePlanet: nextPosition.latitudePlanet,
      nextLatitudeSun: nextPosition.latitudeSun,
      nextLongitudePlanet: nextPosition.longitudePlanet,
      nextLongitudeSun: nextPosition.longitudeSun,
      nextMagnitudes: next.magnitudes,
      previousLatitudePlanet: previousPosition.latitudePlanet,
      previousLatitudeSun: previousPosition.latitudeSun,
      previousLongitudePlanet: previousPosition.longitudePlanet,
      previousLongitudeSun: previousPosition.longitudeSun,
      previousMagnitudes: previous.magnitudes,
    };
  }

  /**
   * Derives the elongation: the true angular separation between planet and sun.
   *
   * A planet well north or south of the ecliptic reads farther from the Sun
   * than its longitude gap alone, which is why greatest elongation is timed
   * by this rather than by the longitude gap.
   */
  getElongationAngle(planet: Coordinates, sun: Coordinates): number {
    return this.mathService.getAngularSeparation(planet, sun);
  }

  /**
   * Determines whether the planet is at greatest brilliancy: its apparent
   * magnitude is lower (brighter) than every margin sample before it and no
   * higher than every margin sample after it.
   *
   * Two magnitude minima are not brilliancies and are refused: a thin
   * crescent near inferior conjunction, past
   * {@link MAXIMUM_BRILLIANCY_PHASE_ANGLE_DEGREES}, and a planet lost in the
   * Sun's glare, closer to it than the rise and set threshold.
   *
   * This gate measures the true separation while rise and set use the
   * longitude gap; near an inferior conjunction far from the ecliptic the
   * two differ, and the phase-angle gate covers that difference.
   */
  isBrightest(args: BrightnessesArguments): boolean {
    const { currentMagnitude, nextMagnitudes, previousMagnitudes } = args;

    return (
      currentMagnitude < Math.min(...previousMagnitudes) &&
      currentMagnitude <= Math.min(...nextMagnitudes) &&
      args.currentPhaseAngle < MAXIMUM_BRILLIANCY_PHASE_ANGLE_DEGREES &&
      this.getElongationAngle(
        [args.currentLongitudePlanet, args.currentLatitudePlanet],
        [args.currentLongitudeSun, args.currentLatitudeSun],
      ) >= RISE_SET_ELONGATION_DEGREES
    );
  }

  /**
   * Determines whether planet is east of sun, by the wrapped signed elongation.
   */
  isEastern(args: CurrentLongitudeArguments): boolean {
    return this.getSignedElongation(args) > 0;
  }

  /**
   * Determines whether planet is brightest while eastern.
   */
  isEasternBrightest(args: BrightnessLongitudeArguments): boolean {
    return this.isEastern(args) && this.isBrightest(args);
  }

  /**
   * Determines whether planet is at eastern elongation maximum.
   */
  isEasternElongation(args: ElongationLongitudeArguments): boolean {
    return this.isElongation(args) && this.isEastern(args);
  }

  /**
   * Determines whether planet is at elongation maximum.
   */
  isElongation(args: ElongationLongitudeArguments): boolean {
    return this.mathService.isMaximum({
      current: this.getElongationAngle(
        [args.currentLongitudePlanet, args.currentLatitudePlanet],
        [args.currentLongitudeSun, args.currentLatitudeSun],
      ),
      next: this.getElongationAngle(
        [args.nextLongitudePlanet, args.nextLatitudePlanet],
        [args.nextLongitudeSun, args.nextLatitudeSun],
      ),
      previous: this.getElongationAngle(
        [args.previousLongitudePlanet, args.previousLatitudePlanet],
        [args.previousLongitudeSun, args.previousLatitudeSun],
      ),
    });
  }

  /**
   * Determines whether planet is in evening position (eastern).
   */
  isEvening(args: CurrentLongitudeArguments): boolean {
    return this.isEastern(args);
  }

  /**
   * Determines whether planet rises in evening.
   */
  isEveningRise(args: RiseSetLongitudeArguments): boolean {
    return this.isEvening(args) && this.isRise(args);
  }

  /**
   * Determines whether planet sets in evening.
   */
  isEveningSet(args: RiseSetLongitudeArguments): boolean {
    return this.isEvening(args) && this.isSet(args);
  }

  /**
   * Determines whether planet is in morning position (western).
   */
  isMorning(args: CurrentLongitudeArguments): boolean {
    return this.isWestern(args);
  }

  /**
   * Determines whether planet rises in morning.
   */
  isMorningRise(args: RiseSetLongitudeArguments): boolean {
    return this.isMorning(args) && this.isRise(args);
  }

  /**
   * Determines whether planet sets in morning.
   */
  isMorningSet(args: RiseSetLongitudeArguments): boolean {
    return this.isMorning(args) && this.isSet(args);
  }

  /**
   * Determines whether planet crosses rise threshold (moving east of sun).
   */
  isRise(args: RiseSetLongitudeArguments): boolean {
    const {
      currentLongitudePlanet,
      currentLongitudeSun,
      previousLongitudePlanet,
      previousLongitudeSun,
    } = args;

    const previousAngle = this.mathService.getAngle(
      previousLongitudePlanet,
      previousLongitudeSun,
    );
    const currentAngle = this.mathService.getAngle(
      currentLongitudePlanet,
      currentLongitudeSun,
    );

    return (
      previousAngle < RISE_SET_ELONGATION_DEGREES &&
      currentAngle >= RISE_SET_ELONGATION_DEGREES
    );
  }

  /**
   * Determines whether planet crosses set threshold (moving west of sun).
   */
  isSet(args: RiseSetLongitudeArguments): boolean {
    const {
      currentLongitudePlanet,
      currentLongitudeSun,
      previousLongitudePlanet,
      previousLongitudeSun,
    } = args;

    const previousAngle = this.mathService.getAngle(
      previousLongitudePlanet,
      previousLongitudeSun,
    );
    const currentAngle = this.mathService.getAngle(
      currentLongitudePlanet,
      currentLongitudeSun,
    );

    return (
      previousAngle > RISE_SET_ELONGATION_DEGREES &&
      currentAngle <= RISE_SET_ELONGATION_DEGREES
    );
  }

  /**
   * Determines whether planet is west of sun, by the wrapped signed elongation.
   */
  isWestern(args: CurrentLongitudeArguments): boolean {
    return this.getSignedElongation(args) < 0;
  }

  /**
   * Determines whether planet is brightest while western.
   */
  isWesternBrightest(args: BrightnessLongitudeArguments): boolean {
    return this.isWestern(args) && this.isBrightest(args);
  }

  /**
   * Determines whether planet is at western elongation maximum.
   */
  isWesternElongation(args: ElongationLongitudeArguments): boolean {
    return this.isElongation(args) && this.isWestern(args);
  }
}
