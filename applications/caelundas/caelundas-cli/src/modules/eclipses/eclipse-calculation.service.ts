import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import { MathService } from "../math/math.service";

import { EclipseEventService } from "./eclipse-event.service";
import { EclipseGeometryService } from "./eclipse-geometry.service";
import { EclipseTopocentricService } from "./eclipse-topocentric.service";

import type { DetectedCalendarEvent } from "../caelundas-database/caelundas-database.types";
import type { EclipsePhase } from "../caelundas/caelundas.types";
import type {
  AzimuthElevationEphemeris,
  CoordinateEphemeris,
  DistanceEphemeris,
} from "../ephemeris/ephemeris.types";
import type {
  EclipseContactGeometry,
  EclipseContactWindow,
  EclipseCoordinates,
} from "./eclipses.types";
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
   * Whether `value` crosses zero upward nearest the current minute: a
   * crossing between the previous minute and this one belongs here when it
   * falls in its second half, and one between this minute and the next when
   * it falls in its first half. Each crossing lands on exactly one minute.
   */
  private static crossesUpwardNearCurrent(
    value: (geometry: EclipseContactGeometry) => number,
    window: EclipseContactWindow,
  ): boolean {
    const previous = value(window.previous);
    const current = value(window.current);
    const next = value(window.next);
    if (previous < 0 && current >= 0) {
      return previous / (previous - current) >= 0.5;
    }
    if (current < 0 && next >= 0) {
      return current / (current - next) < 0.5;
    }
    return false;
  }

  /**
   * Classifies the contacts of one eclipse at the current minute: it
   * begins at the external contact on the way in (P1) and ends at the
   * external contact on the way out (P4).
   */
  private static getContactPhases(
    window: EclipseContactWindow,
    isMaximum: boolean,
  ): EclipsePhase[] {
    const phases: EclipsePhase[] = [];
    if (
      EclipseCalculationService.crossesUpwardNearCurrent(
        (geometry) => geometry.contactLimit - geometry.separation,
        window,
      )
    ) {
      phases.push("beginning");
    }
    if (isMaximum && window.current.separation < window.current.contactLimit) {
      phases.push("maximum");
    }
    if (
      EclipseCalculationService.crossesUpwardNearCurrent(
        (geometry) => geometry.separation - geometry.contactLimit,
        window,
      )
    ) {
      phases.push("ending");
    }
    return phases;
  }

  /**
   * Creates geocentric event payloads for detected eclipse phases.
   */
  private buildGeocentricEclipseEvents(
    minute: Moment,
    solarPhases: EclipsePhase[],
    lunarPhases: EclipsePhase[],
  ): DetectedCalendarEvent[] {
    return [
      ...solarPhases.map((phase) =>
        this.eclipseEventService.buildSolarEclipseEvent({
          date: minute,
          frame: "geocentric",
          phase,
        }),
      ),
      ...lunarPhases.map((phase) =>
        this.eclipseEventService.buildLunarEclipseEvent({
          date: minute,
          frame: "geocentric",
          phase,
        }),
      ),
    ];
  }

  /**
   * Geocentric longitude difference of Moon and Sun at the previous, current
   * and next minute.
   */
  private getLongitudeAngles(
    current: EclipseCoordinates,
    previous: EclipseCoordinates,
    next: EclipseCoordinates,
  ): { current: number; next: number; previous: number } {
    const angle = (coordinates: EclipseCoordinates): number =>
      this.mathService.getAngle(
        coordinates.longitudeMoon,
        coordinates.longitudeSun,
      );
    return {
      current: angle(current),
      next: angle(next),
      previous: angle(previous),
    };
  }

  // 🌎 Public Methods

  /**
   * Samples previous/current/next coordinates used by phase classification.
   */
  getAllEclipseCoordinates(args: {
    minute: Moment;
    moonCoordinateEphemeris: CoordinateEphemeris;
    moonDistanceEphemeris: DistanceEphemeris;
    sunCoordinateEphemeris: CoordinateEphemeris;
    sunDistanceEphemeris: DistanceEphemeris;
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
    events: DetectedCalendarEvent[];
    lunarPhases: EclipsePhase[];
    solarPhases: EclipsePhase[];
  } {
    const solarPhases = this.getSolarEclipsePhases(
      args.currentCoordinates,
      args.previousCoordinates,
      args.nextCoordinates,
    );
    const lunarPhases = this.getLunarEclipsePhases(
      args.currentCoordinates,
      args.previousCoordinates,
      args.nextCoordinates,
    );
    const events = this.buildGeocentricEclipseEvents(
      args.minute,
      solarPhases,
      lunarPhases,
    );

    return { events, lunarPhases, solarPhases };
  }

  /**
   * Classifies the lunar eclipse phases at the current minute, in time
   * order: beginning at P1, maximum, ending at P4.
   */
  getLunarEclipsePhases(
    current: EclipseCoordinates,
    previous: EclipseCoordinates,
    next: EclipseCoordinates,
  ): EclipsePhase[] {
    const window: EclipseContactWindow = {
      current: this.eclipseGeometryService.getLunarContactGeometry(current),
      next: this.eclipseGeometryService.getLunarContactGeometry(next),
      previous: this.eclipseGeometryService.getLunarContactGeometry(previous),
    };
    const isMaximum = this.mathService.isMaximum(
      this.getLongitudeAngles(current, previous, next),
    );

    return EclipseCalculationService.getContactPhases(window, isMaximum);
  }

  /**
   * Classifies the solar eclipse phases at the current minute, in time
   * order: beginning at global P1, maximum, ending at global P4.
   */
  getSolarEclipsePhases(
    current: EclipseCoordinates,
    previous: EclipseCoordinates,
    next: EclipseCoordinates,
  ): EclipsePhase[] {
    const window: EclipseContactWindow = {
      current: this.eclipseGeometryService.getSolarContactGeometry(current),
      next: this.eclipseGeometryService.getSolarContactGeometry(next),
      previous: this.eclipseGeometryService.getSolarContactGeometry(previous),
    };
    const isMaximum = this.mathService.isMinimum(
      this.getLongitudeAngles(current, previous, next),
    );

    return EclipseCalculationService.getContactPhases(window, isMaximum);
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
      lunarPhases: EclipsePhase[];
      solarPhases: EclipsePhase[];
    };
    minute: Moment;
    moonAzimuthElevationEphemeris: AzimuthElevationEphemeris;
    sunAzimuthElevationEphemeris: AzimuthElevationEphemeris;
  }): DetectedCalendarEvent[] {
    const {
      coordinates,
      geocentricPhases,
      minute,
      moonAzimuthElevationEphemeris,
      sunAzimuthElevationEphemeris,
    } = args;
    const maximumOf = (phases: EclipsePhase[]): EclipsePhase | null =>
      phases.includes("maximum") ? "maximum" : null;

    return this.eclipseTopocentricService.getTopocentricEvents({
      currentCoordinates: coordinates.currentCoordinates,
      lunarPhase: maximumOf(geocentricPhases.lunarPhases),
      minute,
      moonAzimuthElevationEphemeris,
      nextCoordinates: coordinates.nextCoordinates,
      previousCoordinates: coordinates.previousCoordinates,
      solarPhase: maximumOf(geocentricPhases.solarPhases),
      sunAzimuthElevationEphemeris,
    });
  }
}
