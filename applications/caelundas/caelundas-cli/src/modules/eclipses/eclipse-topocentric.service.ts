import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import { MathService } from "../math/math.service";

import { EclipseEventService } from "./eclipse-event.service";
import { EclipseGeometryService } from "./eclipse-geometry.service";
import {
  LOCAL_SOLAR_ECLIPSE_MAXIMUM_MINUTES,
  MILLISECONDS_PER_MINUTE,
} from "./eclipses.constants";

import type { DetectedCalendarEvent } from "../caelundas-database/caelundas-database.types";
import type { EclipsePhase } from "../caelundas/caelundas.types";
import type { AzimuthElevationEphemeris } from "../ephemeris/ephemeris.types";
import type { NeighborValues } from "../math/math.types";
import type {
  ClosestApproach,
  EclipseContactGeometry,
  EclipseCoordinates,
  EclipseCoordinatesWindow,
  EclipseOccurrence,
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

  /**
   * The solar eclipse the observer is watching: the local type given to it
   * at its first minute, and the last minute it was seen, so its begins,
   * maximum, ends and span share one title.
   */
  private solarOccurrence: EclipseOccurrence<SolarEclipseType> | null = null;

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * The least separation of a run of minutes, refined between minutes by
   * the parabola through the squared separations either side of it, which
   * is exact for a Moon passing the Sun in a straight line at a steady
   * speed. The minute it falls on supplies the discs.
   */
  private static getClosestApproach(
    run: [ClosestApproach, ...ClosestApproach[]],
  ): ClosestApproach {
    const least = run.reduce((closest, minute) =>
      minute.separation < closest.separation ? minute : closest,
    );
    const index = run.indexOf(least);
    const before = run[index - 1];
    const after = run[index + 1];
    if (before === undefined || after === undefined) {
      return least;
    }
    const previous = before.separation ** 2;
    const current = least.separation ** 2;
    const next = after.separation ** 2;
    const curvature = previous - 2 * current + next;
    if (curvature <= 0) {
      return least;
    }
    return {
      sample: least.sample,
      separation: Math.sqrt(
        Math.max(0, current - (next - previous) ** 2 / (8 * curvature)),
      ),
    };
  }

  /**
   * How far inside its contact limit an eclipse is, degrees: positive while
   * in progress, zero at contact.
   */
  private static getContactMargin(geometry: EclipseContactGeometry): number {
    return geometry.contactLimit - geometry.separation;
  }

  /**
   * The local type of a solar eclipse from the discs at the Moon's closest
   * approach to the Sun: total when the Moon's disc covers the Sun's
   * (s☾ ≥ s☉ and separation ≤ s☾ − s☉), annular when the Sun's disc rings
   * the Moon's (s☉ greater than s☾ and separation ≤ s☉ − s☾), and
   * otherwise partial.
   */
  private static getLocalSolarEclipseType(
    closest: ClosestApproach,
  ): SolarEclipseType {
    const moon = closest.sample.moon.semidiameter;
    const sun = closest.sample.sun.semidiameter;
    if (moon >= sun && closest.separation <= moon - sun) {
      return "total";
    }
    if (moon < sun && closest.separation <= sun - moon) {
      return "annular";
    }
    return "partial";
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
   * Carries the observer's solar eclipse into `minute`: it keeps its local
   * type while visible from one minute to the next, takes a new one from
   * its closest visible approach at its first minute, and ends (null) when
   * no minute of the window is visible. A Sun rising or setting mid-eclipse
   * clips the run it is judged by, but never changes a type once given.
   */
  private continueSolarOccurrence(args: {
    minute: Moment;
    moonAzimuthElevationEphemeris: AzimuthElevationEphemeris;
    samples: TopocentricWindow;
    sunAzimuthElevationEphemeris: AzimuthElevationEphemeris;
  }): null | SolarEclipseType {
    const { minute, samples } = args;
    const isVisible = [samples.previous, samples.current, samples.next].some(
      (sample) => this.getSolarVisibilityMargin(sample) > 0,
    );
    if (!isVisible) {
      this.solarOccurrence = null;
      return null;
    }
    const minuteMilliseconds = minute.valueOf();
    const occurrence = this.solarOccurrence;
    const type =
      occurrence?.minute === minuteMilliseconds - MILLISECONDS_PER_MINUTE
        ? occurrence.type
        : this.getFirstLocalSolarEclipseType(args);
    this.solarOccurrence = { minute: minuteMilliseconds, type };
    return type;
  }

  /**
   * The Moon's closest approach to the Sun over the visible run of minutes
   * that starts within a minute of `minute`, read ahead from the horizon
   * ephemeris until the discs part, the Sun sets or the ephemeris ends.
   * Null when no minute of it is visible.
   */
  private getClosestVisibleApproach(args: {
    minute: Moment;
    moonAzimuthElevationEphemeris: AzimuthElevationEphemeris;
    sunAzimuthElevationEphemeris: AzimuthElevationEphemeris;
  }): ClosestApproach | null {
    const run: ClosestApproach[] = [];
    for (
      let offset = -1;
      offset <= LOCAL_SOLAR_ECLIPSE_MAXIMUM_MINUTES;
      offset += 1
    ) {
      const sample = this.eclipseGeometryService.getTopocentricSample({
        ...args,
        minute: args.minute.clone().add(offset, "minutes"),
      });
      if (sample === null) {
        break;
      }
      const geometry =
        this.eclipseGeometryService.getTopocentricSolarContactGeometry(sample);
      if (
        EclipseTopocentricService.getVisibilityMargin(geometry, sample.sun) > 0
      ) {
        run.push({ sample, separation: geometry.separation });
      } else if (run.length > 0 || offset >= 1) {
        break;
      }
    }
    const [first, ...rest] = run;
    return first === undefined
      ? null
      : EclipseTopocentricService.getClosestApproach([first, ...rest]);
  }

  /**
   * The local type of a solar eclipse first seen at `minute`, from its
   * closest visible approach; partial when none can be read.
   */
  private getFirstLocalSolarEclipseType(args: {
    minute: Moment;
    moonAzimuthElevationEphemeris: AzimuthElevationEphemeris;
    sunAzimuthElevationEphemeris: AzimuthElevationEphemeris;
  }): SolarEclipseType {
    const closest = this.getClosestVisibleApproach({
      minute: args.minute,
      moonAzimuthElevationEphemeris: args.moonAzimuthElevationEphemeris,
      sunAzimuthElevationEphemeris: args.sunAzimuthElevationEphemeris,
    });
    return closest === null
      ? "partial"
      : EclipseTopocentricService.getLocalSolarEclipseType(closest);
  }

  /**
   * How far inside both the limbs' contact and the horizon the observer's
   * solar eclipse is at one minute, degrees: positive while it is visible.
   */
  private getSolarVisibilityMargin(sample: TopocentricSample): number {
    return EclipseTopocentricService.getVisibilityMargin(
      this.eclipseGeometryService.getTopocentricSolarContactGeometry(sample),
      sample.sun,
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
   * Solar events carry the type the observer sees, which differs from the
   * geocentric one away from the central path; lunar events carry the
   * geocentric type, which is the same for every observer.
   */
  getTopocentricEvents(args: {
    currentCoordinates: EclipseCoordinates;
    isLunarMaximum: boolean;
    lunarEclipseType: LunarEclipseType;
    minute: Moment;
    moonAzimuthElevationEphemeris: AzimuthElevationEphemeris;
    nextCoordinates: EclipseCoordinates;
    previousCoordinates: EclipseCoordinates;
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
    const solarType = isSolarInProgress
      ? this.continueSolarOccurrence({
          minute: args.minute,
          moonAzimuthElevationEphemeris: args.moonAzimuthElevationEphemeris,
          samples,
          sunAzimuthElevationEphemeris: args.sunAzimuthElevationEphemeris,
        })
      : null;
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
          type: solarType ?? "partial",
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
