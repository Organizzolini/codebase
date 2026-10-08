import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import { MathService } from "../math/math.service";

import { EclipseClassificationService } from "./eclipse-classification.service";
import { EclipseEventService } from "./eclipse-event.service";
import { EclipseGeometryService } from "./eclipse-geometry.service";
import { EclipseTopocentricService } from "./eclipse-topocentric.service";
import { MILLISECONDS_PER_MINUTE } from "./eclipses.constants";

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
  EclipseOccurrence,
  EclipseType,
  LunarEclipseType,
  SolarEclipseType,
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
    private readonly eclipseClassificationService: EclipseClassificationService,
    private readonly eclipseTopocentricService: EclipseTopocentricService,
    private readonly eclipseEventService: EclipseEventService,
  ) {
    this.logger.setContext(EclipseCalculationService.name);
  }

  // 🔐 Private Fields

  /**
   * The lunar and solar eclipses in progress. A sweep visits minutes in
   * order, so each occurrence keeps the type estimated at its first minute
   * and titles its begins, maximum, ends and span alike, even when later
   * estimates near a type boundary would differ.
   */
  private lunarOccurrence: EclipseOccurrence<LunarEclipseType> | null = null;

  private solarOccurrence: EclipseOccurrence<SolarEclipseType> | null = null;

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Carries an eclipse occurrence into `minute`: it keeps its type when it
   * was seen the minute before, starts with `estimate` when it is new, and
   * ends (null) when no eclipse is in progress.
   */
  private static continueOccurrence<TType extends EclipseType>(
    occurrence: EclipseOccurrence<TType> | null,
    minute: Moment,
    estimate: null | TType,
  ): EclipseOccurrence<TType> | null {
    if (estimate === null) {
      return null;
    }
    const minuteMilliseconds = minute.valueOf();
    const isContinuing =
      occurrence?.minute === minuteMilliseconds - MILLISECONDS_PER_MINUTE;
    return {
      minute: minuteMilliseconds,
      type: isContinuing ? occurrence.type : estimate,
    };
  }

  /**
   * Creates geocentric event payloads for detected eclipse phases. A type
   * the classifier could not settle (an eclipse grazing a boundary) falls
   * back to the weakest: partial for the Sun, penumbral for the Moon.
   */
  private buildGeocentricEclipseEvents(
    minute: Moment,
    solar: { phases: EclipsePhase[]; type: null | SolarEclipseType },
    lunar: { phases: EclipsePhase[]; type: LunarEclipseType | null },
  ): DetectedCalendarEvent[] {
    return [
      ...solar.phases.map((phase) =>
        this.eclipseEventService.buildSolarEclipseEvent({
          date: minute,
          frame: "geocentric",
          phase,
          type: solar.type ?? "partial",
        }),
      ),
      ...lunar.phases.map((phase) =>
        this.eclipseEventService.buildLunarEclipseEvent({
          date: minute,
          frame: "geocentric",
          phase,
          type: lunar.type ?? "penumbral",
        }),
      ),
    ];
  }

  /**
   * Classifies the contacts of one eclipse at the current minute: it
   * begins at the external contact on the way in (P1) and ends at the
   * external contact on the way out (P4).
   */
  private getContactPhases(
    window: EclipseContactWindow,
    isMaximum: boolean,
  ): EclipsePhase[] {
    const values = (
      value: (geometry: EclipseContactGeometry) => number,
    ): { current: number; next: number; previous: number } => ({
      current: value(window.current),
      next: value(window.next),
      previous: value(window.previous),
    });
    const phases: EclipsePhase[] = [];
    if (
      this.mathService.crossesUpwardNearCurrent(
        values((geometry) => geometry.contactLimit - geometry.separation),
      )
    ) {
      phases.push("beginning");
    }
    if (isMaximum && window.current.separation < window.current.contactLimit) {
      phases.push("maximum");
    }
    if (
      this.mathService.crossesUpwardNearCurrent(
        values((geometry) => geometry.separation - geometry.contactLimit),
      )
    ) {
      phases.push("ending");
    }
    return phases;
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
   * Builds geocentric eclipse events and returns their classified phases
   * and eclipse types. Each eclipse keeps the type it had at its first
   * minute; call this for consecutive minutes, as the sweep does.
   */
  getGeocentricEvents(args: {
    currentCoordinates: EclipseCoordinates;
    minute: Moment;
    nextCoordinates: EclipseCoordinates;
    previousCoordinates: EclipseCoordinates;
  }): {
    events: DetectedCalendarEvent[];
    lunarPhases: EclipsePhase[];
    lunarType: LunarEclipseType | null;
    solarPhases: EclipsePhase[];
    solarType: null | SolarEclipseType;
  } {
    const { currentCoordinates, nextCoordinates, previousCoordinates } = args;
    const solarPhases = this.getSolarEclipsePhases(
      currentCoordinates,
      previousCoordinates,
      nextCoordinates,
    );
    const lunarPhases = this.getLunarEclipsePhases(
      currentCoordinates,
      previousCoordinates,
      nextCoordinates,
    );
    this.solarOccurrence = EclipseCalculationService.continueOccurrence(
      this.solarOccurrence,
      args.minute,
      this.eclipseClassificationService.getSolarEclipseType(
        currentCoordinates,
        previousCoordinates,
        nextCoordinates,
      ),
    );
    this.lunarOccurrence = EclipseCalculationService.continueOccurrence(
      this.lunarOccurrence,
      args.minute,
      this.eclipseClassificationService.getLunarEclipseType(
        currentCoordinates,
        previousCoordinates,
        nextCoordinates,
      ),
    );
    const solarType = this.solarOccurrence?.type ?? null;
    const lunarType = this.lunarOccurrence?.type ?? null;
    const events = this.buildGeocentricEclipseEvents(
      args.minute,
      { phases: solarPhases, type: solarType },
      { phases: lunarPhases, type: lunarType },
    );

    return { events, lunarPhases, lunarType, solarPhases, solarType };
  }

  /**
   * Classifies the lunar eclipse phases at the current minute, in time
   * order: beginning at P1, maximum at greatest eclipse (the Moon nearest
   * the shadow axis), ending at P4.
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
    const isMaximum = this.mathService.isMinimum({
      current: window.current.separation,
      next: window.next.separation,
      previous: window.previous.separation,
    });

    return this.getContactPhases(window, isMaximum);
  }

  /**
   * Classifies the solar eclipse phases at the current minute, in time
   * order: beginning at global P1, maximum at greatest eclipse (the shadow
   * axis nearest Earth's center), ending at global P4.
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
    const isMaximum = this.mathService.isMinimum({
      current: this.eclipseClassificationService.getSolarGamma(current),
      next: this.eclipseClassificationService.getSolarGamma(next),
      previous: this.eclipseClassificationService.getSolarGamma(previous),
    });

    return this.getContactPhases(window, isMaximum);
  }

  /**
   * Computes the observer's eclipse events, with the geocentric types and
   * lunar maximum; an unsettled type falls back as for geocentric events.
   */
  getTopocentricEventsForDetect(args: {
    coordinates: {
      currentCoordinates: EclipseCoordinates;
      nextCoordinates: EclipseCoordinates;
      previousCoordinates: EclipseCoordinates;
    };
    geocentricPhases: {
      lunarPhases: EclipsePhase[];
      lunarType: LunarEclipseType | null;
      solarPhases: EclipsePhase[];
      solarType: null | SolarEclipseType;
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
    return this.eclipseTopocentricService.getTopocentricEvents({
      currentCoordinates: coordinates.currentCoordinates,
      isLunarMaximum: geocentricPhases.lunarPhases.includes("maximum"),
      lunarEclipseType: geocentricPhases.lunarType ?? "penumbral",
      minute,
      moonAzimuthElevationEphemeris,
      nextCoordinates: coordinates.nextCoordinates,
      previousCoordinates: coordinates.previousCoordinates,
      solarEclipseType: geocentricPhases.solarType ?? "partial",
      sunAzimuthElevationEphemeris,
    });
  }
}
