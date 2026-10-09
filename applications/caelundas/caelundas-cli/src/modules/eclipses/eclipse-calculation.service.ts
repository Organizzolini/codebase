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

    return EclipseCalculationService.getContactPhases(window, isMaximum);
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

    return EclipseCalculationService.getContactPhases(window, isMaximum);
  }

  /**
   * Computes topocentric eclipse events using geocentric phases, types and
   * visibility; an unsettled type falls back as for geocentric events.
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
    const maximumOf = (phases: EclipsePhase[]): EclipsePhase | null =>
      phases.includes("maximum") ? "maximum" : null;

    return this.eclipseTopocentricService.getTopocentricEvents({
      currentCoordinates: coordinates.currentCoordinates,
      lunarEclipseType: geocentricPhases.lunarType ?? "penumbral",
      lunarPhase: maximumOf(geocentricPhases.lunarPhases),
      minute,
      moonAzimuthElevationEphemeris,
      nextCoordinates: coordinates.nextCoordinates,
      previousCoordinates: coordinates.previousCoordinates,
      solarEclipseType: geocentricPhases.solarType ?? "partial",
      solarPhase: maximumOf(geocentricPhases.solarPhases),
      sunAzimuthElevationEphemeris,
    });
  }
}
