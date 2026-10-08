import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import { MathService } from "../math/math.service";

import { EclipseEventService } from "./eclipse-event.service";
import { EclipseGeometryService } from "./eclipse-geometry.service";

import type { DetectedCalendarEvent } from "../caelundas-database/caelundas-database.types";
import type { EclipsePhase } from "../caelundas/caelundas.types";
import type { AzimuthElevationEphemeris } from "../ephemeris/ephemeris.types";
import type { NeighborValues } from "../math/math.types";
import type {
  EclipseContactGeometry,
  EclipseCoordinates,
  EclipseCoordinatesWindow,
  LunarEclipseType,
  SolarEclipseType,
  TopocentricDisc,
  TopocentricSample,
  TopocentricWindow,
} from "./eclipses.types";
import type { Moment } from "moment-timezone";

/**
 * Computes eclipse events as one observer sees them: a solar eclipse while
 * the topocentric Moon's disc overlaps the Sun's above the horizon, a lunar
 * eclipse while the Moon is in Earth's penumbra and above the horizon.
 */
@Injectable()
export class EclipseTopocentricService {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly mathService: MathService,
    private readonly eclipseGeometryService: EclipseGeometryService,
    private readonly eclipseEventService: EclipseEventService,
  ) {
    this.logger.setContext(EclipseTopocentricService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * How far inside its contact limit an eclipse is, degrees: positive while
   * in progress, zero at contact.
   */
  private static getContactMargin(geometry: EclipseContactGeometry): number {
    return geometry.contactLimit - geometry.separation;
  }

  /**
   * How far inside both its contact limit and the horizon an eclipse is,
   * degrees: positive while it is in progress and the body is up.
   */
  private static getVisibilityMargin(
    geometry: EclipseContactGeometry,
    sample: TopocentricDisc,
  ): number {
    return Math.min(
      EclipseTopocentricService.getContactMargin(geometry),
      sample.clearance,
    );
  }

  /**
   * Classifies one minute of a locally visible eclipse from its visibility
   * margin, positive while the eclipse is both in progress and above the
   * horizon: it begins where the margin turns positive and ends where it
   * turns negative, each on the nearest minute, and peaks at `isMaximum`
   * while visible.
   */
  private getVisiblePhases(
    margins: NeighborValues,
    isMaximum: boolean,
  ): EclipsePhase[] {
    const phases: EclipsePhase[] = [];
    if (this.mathService.crossesUpwardNearCurrent(margins)) {
      phases.push("beginning");
    }
    if (isMaximum && margins.current > 0) {
      phases.push("maximum");
    }
    if (
      this.mathService.crossesUpwardNearCurrent({
        current: -margins.current,
        next: -margins.next,
        previous: -margins.previous,
      })
    ) {
      phases.push("ending");
    }
    return phases;
  }

  /**
   * Whether an eclipse is in progress somewhere on Earth in any minute of
   * the window, by its geocentric contact geometry.
   */
  private isInProgressGeocentrically(
    coordinates: EclipseCoordinatesWindow,
    getGeometry: (current: EclipseCoordinates) => EclipseContactGeometry,
  ): boolean {
    return [coordinates.previous, coordinates.current, coordinates.next].some(
      (minute) =>
        EclipseTopocentricService.getContactMargin(getGeometry(minute)) > 0,
    );
  }

  // 🌎 Public Methods

  /**
   * Classifies the lunar eclipse phases the observer sees at the current
   * minute. The Moon's place in Earth's shadow is the same for everyone, so
   * contacts are geocentric (P1/P4); the observer sees them only while the
   * Moon's upper limb is above the horizon, so a Moon rising or setting
   * eclipsed begins or ends the eclipse at moonrise or moonset. It peaks at
   * greatest eclipse when the Moon is up.
   */
  getLunarTopocentricPhases(args: {
    coordinates: EclipseCoordinatesWindow;
    isGeocentricMaximum: boolean;
    samples: TopocentricWindow;
  }): EclipsePhase[] {
    const { coordinates, isGeocentricMaximum, samples } = args;
    const margin = (
      minuteCoordinates: EclipseCoordinates,
      sample: TopocentricSample,
    ): number =>
      EclipseTopocentricService.getVisibilityMargin(
        this.eclipseGeometryService.getLunarContactGeometry(minuteCoordinates),
        sample.moon,
      );

    return this.getVisiblePhases(
      {
        current: margin(coordinates.current, samples.current),
        next: margin(coordinates.next, samples.next),
        previous: margin(coordinates.previous, samples.previous),
      },
      isGeocentricMaximum,
    );
  }

  /**
   * Classifies the solar eclipse phases the observer sees at the current
   * minute, from the topocentric Sun and Moon: it is in progress while their
   * discs overlap (C1 to C4) and the Sun's upper limb is above the horizon,
   * and it peaks where the Moon passes nearest the Sun. An eclipse whose
   * discs never overlap from here, though its penumbra lies elsewhere on
   * Earth, yields nothing.
   */
  getSolarTopocentricPhases(samples: TopocentricWindow): EclipsePhase[] {
    const geometry = {
      current: this.eclipseGeometryService.getTopocentricSolarContactGeometry(
        samples.current,
      ),
      next: this.eclipseGeometryService.getTopocentricSolarContactGeometry(
        samples.next,
      ),
      previous: this.eclipseGeometryService.getTopocentricSolarContactGeometry(
        samples.previous,
      ),
    };
    return this.getVisiblePhases(
      {
        current: EclipseTopocentricService.getVisibilityMargin(
          geometry.current,
          samples.current.sun,
        ),
        next: EclipseTopocentricService.getVisibilityMargin(
          geometry.next,
          samples.next.sun,
        ),
        previous: EclipseTopocentricService.getVisibilityMargin(
          geometry.previous,
          samples.previous.sun,
        ),
      },
      this.mathService.isMinimum({
        current: geometry.current.separation,
        next: geometry.next.separation,
        previous: geometry.previous.separation,
      }),
    );
  }

  /**
   * Computes the observer's solar and lunar eclipse events at one minute.
   * The observer's sky is read only while an eclipse is in progress
   * somewhere on Earth, since a local eclipse lies inside the global one.
   * Events carry the eclipse's geocentric type.
   */
  getTopocentricEvents(args: {
    currentCoordinates: EclipseCoordinates;
    isLunarMaximum: boolean;
    lunarEclipseType: LunarEclipseType;
    minute: Moment;
    moonAzimuthElevationEphemeris: AzimuthElevationEphemeris;
    nextCoordinates: EclipseCoordinates;
    previousCoordinates: EclipseCoordinates;
    solarEclipseType: SolarEclipseType;
    sunAzimuthElevationEphemeris: AzimuthElevationEphemeris;
  }): DetectedCalendarEvent[] {
    const coordinates: EclipseCoordinatesWindow = {
      current: args.currentCoordinates,
      next: args.nextCoordinates,
      previous: args.previousCoordinates,
    };
    const isSolarInProgress = this.isInProgressGeocentrically(
      coordinates,
      (minute) => this.eclipseGeometryService.getSolarContactGeometry(minute),
    );
    const isLunarInProgress = this.isInProgressGeocentrically(
      coordinates,
      (minute) => this.eclipseGeometryService.getLunarContactGeometry(minute),
    );
    if (!isSolarInProgress && !isLunarInProgress) {
      return [];
    }

    const samples = this.eclipseGeometryService.getAllTopocentricSamples({
      minute: args.minute,
      moonAzimuthElevationEphemeris: args.moonAzimuthElevationEphemeris,
      sunAzimuthElevationEphemeris: args.sunAzimuthElevationEphemeris,
    });
    const solarPhases = isSolarInProgress
      ? this.getSolarTopocentricPhases(samples)
      : [];
    const lunarPhases = isLunarInProgress
      ? this.getLunarTopocentricPhases({
          coordinates,
          isGeocentricMaximum: args.isLunarMaximum,
          samples,
        })
      : [];

    return [
      ...solarPhases.map((phase) =>
        this.eclipseEventService.buildSolarEclipseEvent({
          date: args.minute,
          frame: "topocentric",
          phase,
          type: args.solarEclipseType,
        }),
      ),
      ...lunarPhases.map((phase) =>
        this.eclipseEventService.buildLunarEclipseEvent({
          date: args.minute,
          frame: "topocentric",
          phase,
          type: args.lunarEclipseType,
        }),
      ),
    ];
  }
}
