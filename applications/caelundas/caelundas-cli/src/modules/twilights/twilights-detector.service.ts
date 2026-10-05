import { Injectable } from "@nestjs/common";

import { EphemerisService } from "../ephemeris/ephemeris.service";

import { TwilightsBuilderService } from "./twilights-builder.service";

import type { Event } from "../calendar/calendar.types";
import type { AzimuthElevationEphemeris } from "../ephemeris/ephemeris.types";
import type { Twilight } from "./twilights.types";
import type { Moment } from "moment-timezone";

/**
 * Detects dawn/dusk boundary crossings by comparing consecutive Sun elevations to twilight thresholds.
 */
@Injectable()
export class TwilightsDetectorService {
  // 🏗 Dependency Injection

  constructor(
    private readonly twilightsBuilderService: TwilightsBuilderService,
    private readonly ephemerisService: EphemerisService,
  ) {}

  // 🔐 Private Fields

  private static readonly degreesByTwilight: Record<Twilight, number> = {
    astronomical: 18,
    civil: 6,
    nautical: 12,
  };

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Evaluates all twilight predicates for one minute and returns matching transition events.
   */
  buildTwilightTransitionEvents(
    elevations: { currentElevation: number; previousElevation: number },
    date: Moment,
  ): Event[] {
    const detectedTransitionEvents: Event[] = [];

    if (this.isAstronomicalDawn({ ...elevations })) {
      detectedTransitionEvents.push(
        this.twilightsBuilderService.buildAstronomicalDawnEvent(date),
      );
    }
    if (this.isNauticalDawn({ ...elevations })) {
      detectedTransitionEvents.push(
        this.twilightsBuilderService.buildNauticalDawnEvent(date),
      );
    }
    if (this.isCivilDawn({ ...elevations })) {
      detectedTransitionEvents.push(
        this.twilightsBuilderService.buildCivilDawnEvent(date),
      );
    }
    if (this.isCivilDusk({ ...elevations })) {
      detectedTransitionEvents.push(
        this.twilightsBuilderService.buildCivilDuskEvent(date),
      );
    }
    if (this.isNauticalDusk({ ...elevations })) {
      detectedTransitionEvents.push(
        this.twilightsBuilderService.buildNauticalDuskEvent(date),
      );
    }
    if (this.isAstronomicalDusk({ ...elevations })) {
      detectedTransitionEvents.push(
        this.twilightsBuilderService.buildAstronomicalDuskEvent(date),
      );
    }

    return detectedTransitionEvents;
  }

  /**
   * Extracts current and previous-minute Sun elevations used by threshold crossing tests.
   */
  getSunElevations(
    sunAzimuthElevationEphemeris: AzimuthElevationEphemeris,
    minute: Moment,
  ): { currentElevation: number; previousElevation: number } {
    const previousMinute = minute.clone().subtract(1, "minute");
    const currentElevation =
      this.ephemerisService.getAzimuthElevationFromEphemeris(
        sunAzimuthElevationEphemeris,
        minute.toISOString(),
        "elevation",
      );
    const previousElevation =
      this.ephemerisService.getAzimuthElevationFromEphemeris(
        sunAzimuthElevationEphemeris,
        previousMinute.toISOString(),
        "elevation",
      );
    return { currentElevation, previousElevation };
  }

  /**
   * Returns `true` when elevation crosses the astronomical threshold (-18 degrees) upward.
   */
  isAstronomicalDawn(args: {
    currentElevation: number;
    previousElevation: number;
  }): boolean {
    return this.isDawn({ ...args, twilight: "astronomical" });
  }

  /**
   * Returns `true` when elevation crosses the astronomical threshold (-18 degrees) downward.
   */
  isAstronomicalDusk(args: {
    currentElevation: number;
    previousElevation: number;
  }): boolean {
    return this.isDusk({ ...args, twilight: "astronomical" });
  }

  /**
   * Returns `true` when elevation crosses the civil threshold (-6 degrees) upward.
   */
  isCivilDawn(args: {
    currentElevation: number;
    previousElevation: number;
  }): boolean {
    return this.isDawn({ ...args, twilight: "civil" });
  }

  /**
   * Returns `true` when elevation crosses the civil threshold (-6 degrees) downward.
   */
  isCivilDusk(args: {
    currentElevation: number;
    previousElevation: number;
  }): boolean {
    return this.isDusk({ ...args, twilight: "civil" });
  }

  /**
   * Generic upward threshold crossing predicate for the requested twilight band.
   */
  isDawn(args: {
    currentElevation: number;
    previousElevation: number;
    twilight: Twilight;
  }): boolean {
    const { currentElevation, previousElevation, twilight } = args;
    const degrees = TwilightsDetectorService.degreesByTwilight[twilight];
    return currentElevation > -degrees && previousElevation < -degrees;
  }

  /**
   * Generic downward threshold crossing predicate for the requested twilight band.
   */
  isDusk(args: {
    currentElevation: number;
    previousElevation: number;
    twilight: Twilight;
  }): boolean {
    const { currentElevation, previousElevation, twilight } = args;
    const degrees = TwilightsDetectorService.degreesByTwilight[twilight];
    return currentElevation < -degrees && previousElevation > -degrees;
  }

  /**
   * Returns `true` when elevation crosses the nautical threshold (-12 degrees) upward.
   */
  isNauticalDawn(args: {
    currentElevation: number;
    previousElevation: number;
  }): boolean {
    return this.isDawn({ ...args, twilight: "nautical" });
  }

  /**
   * Returns `true` when elevation crosses the nautical threshold (-12 degrees) downward.
   */
  isNauticalDusk(args: {
    currentElevation: number;
    previousElevation: number;
  }): boolean {
    return this.isDusk({ ...args, twilight: "nautical" });
  }
}
