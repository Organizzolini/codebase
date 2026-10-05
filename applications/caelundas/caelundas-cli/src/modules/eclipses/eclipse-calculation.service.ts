import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logger";

import { MathService } from "../math/math.service";

import { EclipseEventService } from "./eclipse-event.service";
import { EclipseGeometryService } from "./eclipse-geometry.service";
import { EclipseTopocentricService } from "./eclipse-topocentric.service";

import type { EclipsePhase } from "../caelundas/caelundas.types";
import type { Event } from "../calendar/calendar.types";
import type {
  AzimuthElevationEphemeris,
  CoordinateEphemeris,
  DiameterEphemeris,
} from "../ephemeris/ephemeris.types";
import type { EclipseCoordinates } from "./eclipses.types";
import type { Moment } from "moment-timezone";

/**
 * Computes eclipse phases and builds geocentric/topocentric eclipse events.
 */
@Injectable()
export class EclipseCalculationService {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly mathService: MathService,
    private readonly eclipseGeometryService: EclipseGeometryService,
    private readonly eclipseTopocentricService: EclipseTopocentricService,
    private readonly eclipseEventService: EclipseEventService,
  ) {
    this.logger.setContext(EclipseCalculationService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Creates geocentric event payloads for detected eclipse phases.
   */
  private buildGeocentricEclipseEvents(
    minute: Moment,
    solarPhase: EclipsePhase | null,
    lunarPhase: EclipsePhase | null,
  ): Event[] {
    const events: Event[] = [];

    if (solarPhase) {
      events.push(
        this.eclipseEventService.buildSolarEclipseEvent({
          date: minute,
          frame: "geocentric",
          phase: solarPhase,
        }),
      );
    }

    if (lunarPhase) {
      events.push(
        this.eclipseEventService.buildLunarEclipseEvent({
          date: minute,
          frame: "geocentric",
          phase: lunarPhase,
        }),
      );
    }

    return events;
  }

  /**
   * Classifies lunar eclipse phase from geometric transitions.
   */
  private getLunarEclipsePhase(args: {
    currentDiameter: number;
    currentLongitudeAngle: number;
    isCurrentInEclipse: boolean;
    isMaximumLongitudeAngle: boolean;
    nextLongitudeAngle: number;
    previousLongitudeAngle: number;
  }): EclipsePhase | null {
    if (!args.isCurrentInEclipse) {
      return null;
    }

    if (args.isMaximumLongitudeAngle) {
      return "maximum";
    }

    const threshold = 180 - args.currentDiameter;

    if (this.isLunarEclipseBeginning(args, threshold)) {
      return "beginning";
    }

    if (this.isLunarEclipseEnding(args, threshold)) {
      return "ending";
    }

    return null;
  }

  /**
   * Classifies solar eclipse phase from geometric transitions.
   */
  private getSolarEclipsePhase(args: {
    currentDiameter: number;
    currentLongitudeAngle: number;
    isCurrentInEclipse: boolean;
    isMinimumLongitudeAngle: boolean;
    nextLongitudeAngle: number;
    previousLongitudeAngle: number;
  }): EclipsePhase | null {
    if (!args.isCurrentInEclipse) {
      return null;
    }

    if (args.isMinimumLongitudeAngle) {
      return "maximum";
    }

    if (this.isSolarEclipseBeginning(args, args.currentDiameter)) {
      return "beginning";
    }

    if (this.isSolarEclipseEnding(args, args.currentDiameter)) {
      return "ending";
    }

    return null;
  }

  /**
   * Checks lunar eclipse ingress transition against opposition threshold.
   */
  private isLunarEclipseBeginning(
    args: { currentLongitudeAngle: number; previousLongitudeAngle: number },
    threshold: number,
  ): boolean {
    const isApproaching =
      args.previousLongitudeAngle < args.currentLongitudeAngle;

    return (
      isApproaching &&
      args.previousLongitudeAngle < threshold &&
      args.currentLongitudeAngle >= threshold
    );
  }

  /**
   * Checks lunar eclipse egress transition against opposition threshold.
   */
  private isLunarEclipseEnding(
    args: { currentLongitudeAngle: number; nextLongitudeAngle: number },
    threshold: number,
  ): boolean {
    const isLeaving = args.currentLongitudeAngle > args.nextLongitudeAngle;

    return (
      isLeaving &&
      args.nextLongitudeAngle < threshold &&
      args.currentLongitudeAngle >= threshold
    );
  }

  /**
   * Checks solar eclipse ingress transition against conjunction threshold.
   */
  private isSolarEclipseBeginning(
    args: { currentLongitudeAngle: number; previousLongitudeAngle: number },
    threshold: number,
  ): boolean {
    const isApproaching =
      args.previousLongitudeAngle > args.currentLongitudeAngle;

    return (
      isApproaching &&
      args.previousLongitudeAngle > threshold &&
      args.currentLongitudeAngle <= threshold
    );
  }

  /**
   * Checks solar eclipse egress transition against conjunction threshold.
   */
  private isSolarEclipseEnding(
    args: { currentLongitudeAngle: number; nextLongitudeAngle: number },
    threshold: number,
  ): boolean {
    const isLeaving = args.currentLongitudeAngle < args.nextLongitudeAngle;

    return (
      isLeaving &&
      args.nextLongitudeAngle > threshold &&
      args.currentLongitudeAngle <= threshold
    );
  }

  // 🌎 Public Methods

  /**
   * Samples previous/current/next coordinates used by phase classification.
   */
  getAllEclipseCoordinates(args: {
    minute: Moment;
    moonCoordinateEphemeris: CoordinateEphemeris;
    moonDiameterEphemeris: DiameterEphemeris;
    sunCoordinateEphemeris: CoordinateEphemeris;
    sunDiameterEphemeris: DiameterEphemeris;
  }): {
    currentCoordinates: EclipseCoordinates;
    nextCoordinates: EclipseCoordinates;
    previousCoordinates: EclipseCoordinates;
  } {
    return this.eclipseGeometryService.getAllEclipseCoordinates(args);
  }

  /**
   * Builds geocentric eclipse events and returns their classified phases.
   */
  getGeocentricEvents(args: {
    currentCoordinates: EclipseCoordinates;
    minute: Moment;
    nextCoordinates: EclipseCoordinates;
    previousCoordinates: EclipseCoordinates;
  }): {
    events: Event[];
    lunarPhase: EclipsePhase | null;
    solarPhase: EclipsePhase | null;
  } {
    const solarPhase = this.isSolarEclipse(
      args.currentCoordinates,
      args.previousCoordinates,
      args.nextCoordinates,
    );
    const lunarPhase = this.isLunarEclipse(
      args.currentCoordinates,
      args.previousCoordinates,
      args.nextCoordinates,
    );
    const events = this.buildGeocentricEclipseEvents(
      args.minute,
      solarPhase,
      lunarPhase,
    );

    return { events, lunarPhase, solarPhase };
  }

  /**
   * Computes topocentric eclipse events using geocentric phases and visibility.
   */
  getTopocentricEventsForDetect(args: {
    coordinates: {
      currentCoordinates: EclipseCoordinates;
      nextCoordinates: EclipseCoordinates;
      previousCoordinates: EclipseCoordinates;
    };
    geocentricPhases: {
      lunarPhase: EclipsePhase | null;
      solarPhase: EclipsePhase | null;
    };
    minute: Moment;
    moonAzimuthElevationEphemeris: AzimuthElevationEphemeris;
    sunAzimuthElevationEphemeris: AzimuthElevationEphemeris;
  }): Event[] {
    const {
      coordinates,
      geocentricPhases,
      minute,
      moonAzimuthElevationEphemeris,
      sunAzimuthElevationEphemeris,
    } = args;

    return this.eclipseTopocentricService.getTopocentricEvents({
      currentCoordinates: coordinates.currentCoordinates,
      lunarPhase: geocentricPhases.lunarPhase,
      minute,
      moonAzimuthElevationEphemeris,
      nextCoordinates: coordinates.nextCoordinates,
      previousCoordinates: coordinates.previousCoordinates,
      solarPhase: geocentricPhases.solarPhase,
      sunAzimuthElevationEphemeris,
    });
  }

  /**
   * Classifies the current solar eclipse phase from coordinate progression.
   */
  isLunarEclipse(
    current: EclipseCoordinates,
    previous: EclipseCoordinates,
    next: EclipseCoordinates,
  ): EclipsePhase | null {
    const {
      currentDiameter,
      currentLatitudeAngle,
      currentLongitudeAngle,
      nextLongitudeAngle,
      previousLongitudeAngle,
    } = this.eclipseGeometryService.getEclipseAngles(current, previous, next);

    const isCurrentInEclipse = currentLatitudeAngle < currentDiameter;
    const isMaximumLongitudeAngle = this.mathService.isMaximum({
      current: currentLongitudeAngle,
      next: nextLongitudeAngle,
      previous: previousLongitudeAngle,
    });

    return this.getLunarEclipsePhase({
      currentDiameter,
      currentLongitudeAngle,
      isCurrentInEclipse,
      isMaximumLongitudeAngle,
      nextLongitudeAngle,
      previousLongitudeAngle,
    });
  }

  /**
   * Checks whether lunar geometry is currently within eclipse limits.
   */
  isLunarEclipseActive(current: EclipseCoordinates): boolean {
    return this.eclipseTopocentricService.isLunarEclipseActive(current);
  }

  /**
   * Checks whether lunar eclipse is active and visible from observer location.
   */
  isLunarTopocentricActive(
    coordinates: EclipseCoordinates,
    isVisible: boolean,
  ): boolean {
    return this.eclipseTopocentricService.isLunarTopocentricActive(
      coordinates,
      isVisible,
    );
  }

  /**
   * Classifies the current solar eclipse phase from coordinate progression.
   */
  isSolarEclipse(
    current: EclipseCoordinates,
    previous: EclipseCoordinates,
    next: EclipseCoordinates,
  ): EclipsePhase | null {
    const {
      currentDiameter,
      currentLatitudeAngle,
      currentLongitudeAngle,
      nextLongitudeAngle,
      previousLongitudeAngle,
    } = this.eclipseGeometryService.getEclipseAngles(current, previous, next);

    const isCurrentInEclipse = currentLatitudeAngle < currentDiameter;
    const isMinimumLongitudeAngle = this.mathService.isMinimum({
      current: currentLongitudeAngle,
      next: nextLongitudeAngle,
      previous: previousLongitudeAngle,
    });

    return this.getSolarEclipsePhase({
      currentDiameter,
      currentLongitudeAngle,
      isCurrentInEclipse,
      isMinimumLongitudeAngle,
      nextLongitudeAngle,
      previousLongitudeAngle,
    });
  }

  /**
   * Checks whether solar geometry is currently within eclipse limits.
   */
  isSolarEclipseActive(current: EclipseCoordinates): boolean {
    return this.eclipseTopocentricService.isSolarEclipseActive(current);
  }

  /**
   * Checks whether solar eclipse is active and visible from observer location.
   */
  isSolarTopocentricActive(
    coordinates: EclipseCoordinates,
    isVisible: boolean,
  ): boolean {
    return this.eclipseTopocentricService.isSolarTopocentricActive(
      coordinates,
      isVisible,
    );
  }
}
