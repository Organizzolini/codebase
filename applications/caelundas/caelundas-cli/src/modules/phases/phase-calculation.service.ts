import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logger";

import { MARGIN_MINUTES } from "../caelundas/caelundas.constants";
import { EphemerisService } from "../ephemeris/ephemeris.service";
import { MathService } from "../math/math.service";
import { TwilightsService } from "../twilights/twilights.service";

import type { Event } from "../calendar/calendar.types";
import type {
  BrightnessArguments,
  BrightnessesArguments,
  BrightnessLongitudeArguments,
  CurrentLongitudeArguments,
  ElongationLongitudeArguments,
  GatherCurrentEphemerisArguments,
  GatherMarginEphemerisArguments,
  GatherPhaseParametersArguments,
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

  private readonly riseSetThreshold = TwilightsService.degreesByTwilight.civil;

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Derives apparent brightness from illumination and distance.
   *
   * Inverse-square: the same illuminated fraction seen twice as far away
   * reads a quarter as bright. Relative, not a magnitude — only ever compared
   * against other samples of the same body.
   */
  private getBrightness(args: BrightnessArguments): number {
    return args.illumination / args.distance ** 2;
  }

  /**
   * Derives one brightness per sample, refusing mismatched sample arrays.
   *
   * The two arrays are read positionally — sample `n`'s distance against
   * sample `n`'s illumination — so a length mismatch is not a shorter answer
   * but a wrong one, and the `label` names which margin was malformed.
   */
  private mapBrightnessArray(
    distances: number[],
    illuminations: number[],
    label: string,
  ): number[] {
    if (distances.length !== illuminations.length) {
      throw new Error(
        `${label} distances and illuminations arrays must have the same length`,
      );
    }
    return distances.map((distance, index) => {
      const illumination = illuminations[index];
      if (illumination === undefined) {
        throw new Error(`Missing illumination at index ${index}`);
      }
      return this.getBrightness({ distance, illumination });
    });
  }

  // 🌎 Public Methods

  /**
   * Filters events by category.
   */
  filterByCategory(events: Event[], category: string): Event[] {
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
    | "currentDistance"
    | "currentIllumination"
    | "currentLongitudePlanet"
    | "currentLongitudeSun"
  > {
    const {
      distanceEphemeris,
      illuminationEphemeris,
      isoNow,
      planetCoordinateEphemeris,
      sunCoordinateEphemeris,
    } = args;
    return {
      currentDistance: this.ephemerisService.getDistanceFromEphemeris(
        distanceEphemeris,
        isoNow,
        "currentDistance",
      ),
      currentIllumination: this.ephemerisService.getIlluminationFromEphemeris(
        illuminationEphemeris,
        isoNow,
        "currentIllumination",
      ),
      currentLongitudePlanet: this.ephemerisService.getCoordinateFromEphemeris(
        planetCoordinateEphemeris,
        isoNow,
        "longitude",
      ),
      currentLongitudeSun: this.ephemerisService.getCoordinateFromEphemeris(
        sunCoordinateEphemeris,
        isoNow,
        "longitude",
      ),
    };
  }

  /**
   * Gathers margin ephemeris arrays for brightness extrema detection.
   */
  gatherMarginEphemeris(
    args: GatherMarginEphemerisArguments,
  ): MarginEphemerisSample {
    const { direction, distanceEphemeris, illuminationEphemeris, minute } =
      args;

    const distances = Array.from(
      { length: MARGIN_MINUTES },
      (_index, index) => {
        const m =
          direction === "previous"
            ? minute.clone().subtract(MARGIN_MINUTES - index, "minutes")
            : minute.clone().add(index + 1, "minute");
        return this.ephemerisService.getDistanceFromEphemeris(
          distanceEphemeris,
          m.toISOString(),
          `${direction}Distance`,
        );
      },
    );
    const illuminations = Array.from(
      { length: MARGIN_MINUTES },
      (_index, index) => {
        const m =
          direction === "previous"
            ? minute.clone().subtract(MARGIN_MINUTES - index, "minutes")
            : minute.clone().add(index + 1, "minute");
        return this.ephemerisService.getIlluminationFromEphemeris(
          illuminationEphemeris,
          m.toISOString(),
          `${direction}Illumination`,
        );
      },
    );
    return { distances, illuminations };
  }

  /**
   * Gathers complete phase parameters including longitudes and margin samples.
   */
  gatherPhaseParameters(args: GatherPhaseParametersArguments): PhaseParameters {
    const {
      distanceEphemeris,
      illuminationEphemeris,
      minute,
      planetCoordinateEphemeris,
      sunCoordinateEphemeris,
    } = args;
    const isoNow = minute.toISOString();
    const isoPrevious = minute.clone().subtract(1, "minute").toISOString();
    const isoNext = minute.clone().add(1, "minute").toISOString();
    const current = this.gatherCurrentEphemeris({
      distanceEphemeris,
      illuminationEphemeris,
      isoNow,
      planetCoordinateEphemeris,
      sunCoordinateEphemeris,
    });
    const previous = this.gatherMarginEphemeris({
      direction: "previous",
      distanceEphemeris,
      illuminationEphemeris,
      minute,
    });
    const next = this.gatherMarginEphemeris({
      direction: "next",
      distanceEphemeris,
      illuminationEphemeris,
      minute,
    });
    return {
      ...current,
      nextDistances: next.distances,
      nextIlluminations: next.illuminations,
      nextLongitudePlanet: this.ephemerisService.getCoordinateFromEphemeris(
        planetCoordinateEphemeris,
        isoNext,
        "longitude",
      ),
      nextLongitudeSun: this.ephemerisService.getCoordinateFromEphemeris(
        sunCoordinateEphemeris,
        isoNext,
        "longitude",
      ),
      previousDistances: previous.distances,
      previousIlluminations: previous.illuminations,
      previousLongitudePlanet: this.ephemerisService.getCoordinateFromEphemeris(
        planetCoordinateEphemeris,
        isoPrevious,
        "longitude",
      ),
      previousLongitudeSun: this.ephemerisService.getCoordinateFromEphemeris(
        sunCoordinateEphemeris,
        isoPrevious,
        "longitude",
      ),
    };
  }

  /**
   * Derives brightnesses from current and margin illumination/distance samples.
   *
   * The margins are what make a brightness maximum detectable: a sample is
   * only brightest if the samples either side of it are dimmer, so all three
   * are computed together rather than one call at a time.
   */
  getBrightnesses(args: BrightnessesArguments): {
    currentBrightness: number;
    nextBrightnesses: number[];
    previousBrightnesses: number[];
  } {
    return {
      currentBrightness: this.getBrightness({
        distance: args.currentDistance,
        illumination: args.currentIllumination,
      }),
      nextBrightnesses: this.mapBrightnessArray(
        args.nextDistances,
        args.nextIlluminations,
        "next",
      ),
      previousBrightnesses: this.mapBrightnessArray(
        args.previousDistances,
        args.previousIlluminations,
        "previous",
      ),
    };
  }

  /**
   * Derives elongation angle between planet and sun.
   */
  getElongationAngle(longitudePlanet: number, longitudeSun: number): number {
    return this.mathService.getAngle(longitudePlanet, longitudeSun);
  }

  /**
   * Determines whether planet is brightest among previous and next margin samples.
   */
  isBrightest(args: BrightnessesArguments): boolean {
    const { currentBrightness, nextBrightnesses, previousBrightnesses } =
      this.getBrightnesses(args);

    return (
      currentBrightness > Math.max(...previousBrightnesses) &&
      currentBrightness >= Math.max(...nextBrightnesses)
    );
  }

  /**
   * Determines whether planet is east of sun.
   */
  isEastern(args: CurrentLongitudeArguments): boolean {
    return args.currentLongitudePlanet > args.currentLongitudeSun;
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
    const {
      currentLongitudePlanet,
      currentLongitudeSun,
      nextLongitudePlanet,
      nextLongitudeSun,
      previousLongitudePlanet,
      previousLongitudeSun,
    } = args;

    return this.mathService.isMaximum({
      current: this.getElongationAngle(
        currentLongitudePlanet,
        currentLongitudeSun,
      ),
      next: this.getElongationAngle(nextLongitudePlanet, nextLongitudeSun),
      previous: this.getElongationAngle(
        previousLongitudePlanet,
        previousLongitudeSun,
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
      previousAngle < this.riseSetThreshold &&
      currentAngle >= this.riseSetThreshold
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
      previousAngle > this.riseSetThreshold &&
      currentAngle <= this.riseSetThreshold
    );
  }

  /**
   * Determines whether planet is west of sun.
   */
  isWestern(args: CurrentLongitudeArguments): boolean {
    return args.currentLongitudePlanet < args.currentLongitudeSun;
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
