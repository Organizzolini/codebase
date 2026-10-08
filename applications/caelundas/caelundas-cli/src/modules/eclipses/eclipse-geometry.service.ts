import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import {
  KILOMETERS_PER_ASTRONOMICAL_UNIT,
  radiusKilometersByHorizonBody,
} from "../ephemeris/ephemeris.constants";
import { EphemerisService } from "../ephemeris/ephemeris.service";

import {
  DANJON_SHADOW_ENLARGEMENT,
  DEGREES_PER_RADIAN,
  EARTH_EQUATORIAL_RADIUS_KILOMETERS,
  HORIZON_REFRACTION_DEGREES,
} from "./eclipses.constants";

import type {
  AzimuthElevationEphemeris,
  CoordinateEphemeris,
  DistanceEphemeris,
} from "../ephemeris/ephemeris.types";
import type {
  EclipseContactGeometry,
  EclipseCoordinates,
  TopocentricDisc,
  TopocentricSample,
  TopocentricWindow,
} from "./eclipses.types";
import type { Moment } from "moment-timezone";

/**
 * Samples eclipse geometry and visibility values from ephemerides.
 */
@Injectable()
export class EclipseGeometryService {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly ephemerisService: EphemerisService,
  ) {
    this.logger.setContext(EclipseGeometryService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Great-circle separation of two ecliptic positions, in degrees. The
   * haversine form stays accurate at the small separations eclipses need.
   */
  private static getAngularSeparation(
    first: { latitude: number; longitude: number },
    second: { latitude: number; longitude: number },
  ): number {
    const latitude1 = first.latitude / DEGREES_PER_RADIAN;
    const latitude2 = second.latitude / DEGREES_PER_RADIAN;
    const latitudeHalf = (latitude2 - latitude1) / 2;
    const longitudeHalf =
      (second.longitude - first.longitude) / DEGREES_PER_RADIAN / 2;
    const haversine =
      Math.sin(latitudeHalf) ** 2 +
      Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeHalf) ** 2;
    return (
      2 * Math.asin(Math.min(1, Math.sqrt(haversine))) * DEGREES_PER_RADIAN
    );
  }

  /**
   * Angle in degrees subtended by `kilometers` at `distance` AU: a
   * semidiameter for a body's radius, a horizontal parallax for Earth's.
   */
  private static getSubtendedAngle(
    kilometers: number,
    distance: number,
  ): number {
    return (
      Math.asin(kilometers / (distance * KILOMETERS_PER_ASTRONOMICAL_UNIT)) *
      DEGREES_PER_RADIAN
    );
  }

  /**
   * Derives eclipse coordinates for one minute.
   */
  private getEclipseCoordinates(args: {
    minuteIso: string;
    moonCoordinateEphemeris: CoordinateEphemeris;
    moonDistanceEphemeris: DistanceEphemeris;
    sunCoordinateEphemeris: CoordinateEphemeris;
    sunDistanceEphemeris: DistanceEphemeris;
  }): EclipseCoordinates {
    const { minuteIso } = args;
    const coordinate = (
      ephemeris: CoordinateEphemeris,
      field: "latitude" | "longitude",
    ): number =>
      this.ephemerisService.getCoordinateFromEphemeris(
        ephemeris,
        minuteIso,
        field,
      );

    return {
      distanceMoon: this.ephemerisService.getDistanceFromEphemeris(
        args.moonDistanceEphemeris,
        minuteIso,
        "distanceMoon",
      ),
      distanceSun: this.ephemerisService.getDistanceFromEphemeris(
        args.sunDistanceEphemeris,
        minuteIso,
        "distanceSun",
      ),
      latitudeMoon: coordinate(args.moonCoordinateEphemeris, "latitude"),
      latitudeSun: coordinate(args.sunCoordinateEphemeris, "latitude"),
      longitudeMoon: coordinate(args.moonCoordinateEphemeris, "longitude"),
      longitudeSun: coordinate(args.sunCoordinateEphemeris, "longitude"),
    };
  }

  /**
   * Reads one body's topocentric disc at one minute from its horizon ephemeris.
   */
  private getTopocentricDisc(
    ephemeris: AzimuthElevationEphemeris,
    minuteIso: string,
  ): TopocentricDisc {
    const field = (
      name:
        | "eclipticLatitude"
        | "eclipticLongitude"
        | "semidiameter"
        | "trueElevation",
    ): number =>
      this.ephemerisService.getAzimuthElevationFromEphemeris(
        ephemeris,
        minuteIso,
        name,
      );
    const semidiameter = field("semidiameter");

    return {
      clearance:
        field("trueElevation") + HORIZON_REFRACTION_DEGREES + semidiameter,
      latitude: field("eclipticLatitude"),
      longitude: field("eclipticLongitude"),
      semidiameter,
    };
  }

  // 🌎 Public Methods

  /**
   * Derives all eclipse coordinates around the current minute.
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
    const minuteIso = args.minute.toISOString();
    const previousIso = args.minute.clone().subtract(1, "minute").toISOString();
    const nextIso = args.minute.clone().add(1, "minute").toISOString();

    const common = {
      moonCoordinateEphemeris: args.moonCoordinateEphemeris,
      moonDistanceEphemeris: args.moonDistanceEphemeris,
      sunCoordinateEphemeris: args.sunCoordinateEphemeris,
      sunDistanceEphemeris: args.sunDistanceEphemeris,
    };

    return {
      currentCoordinates: this.getEclipseCoordinates({ minuteIso, ...common }),
      nextCoordinates: this.getEclipseCoordinates({
        minuteIso: nextIso,
        ...common,
      }),
      previousCoordinates: this.getEclipseCoordinates({
        minuteIso: previousIso,
        ...common,
      }),
    };
  }

  /**
   * Samples the topocentric Sun and Moon around the current minute.
   */
  getAllTopocentricSamples(args: {
    minute: Moment;
    moonAzimuthElevationEphemeris: AzimuthElevationEphemeris;
    sunAzimuthElevationEphemeris: AzimuthElevationEphemeris;
  }): TopocentricWindow {
    const sample = (minute: Moment): TopocentricSample => {
      const minuteIso = minute.toISOString();
      return {
        moon: this.getTopocentricDisc(
          args.moonAzimuthElevationEphemeris,
          minuteIso,
        ),
        sun: this.getTopocentricDisc(
          args.sunAzimuthElevationEphemeris,
          minuteIso,
        ),
      };
    };

    return {
      current: sample(args.minute),
      next: sample(args.minute.clone().add(1, "minute")),
      previous: sample(args.minute.clone().subtract(1, "minute")),
    };
  }

  /** The antisolar point, which the axis of Earth's shadow passes through. */
  getAntisolarPoint(coordinates: EclipseCoordinates): {
    latitude: number;
    longitude: number;
  } {
    return {
      latitude: -coordinates.latitudeSun,
      longitude: coordinates.longitudeSun + 180,
    };
  }

  /**
   * Horizontal parallaxes and semidiameters of the Moon and Sun, in degrees,
   * from their geocentric distances.
   */
  getDiscAngles(coordinates: EclipseCoordinates): {
    moonParallax: number;
    moonSemidiameter: number;
    sunParallax: number;
    sunSemidiameter: number;
  } {
    const { distanceMoon, distanceSun } = coordinates;
    return {
      moonParallax: EclipseGeometryService.getSubtendedAngle(
        EARTH_EQUATORIAL_RADIUS_KILOMETERS,
        distanceMoon,
      ),
      moonSemidiameter: EclipseGeometryService.getSubtendedAngle(
        radiusKilometersByHorizonBody.moon,
        distanceMoon,
      ),
      sunParallax: EclipseGeometryService.getSubtendedAngle(
        EARTH_EQUATORIAL_RADIUS_KILOMETERS,
        distanceSun,
      ),
      sunSemidiameter: EclipseGeometryService.getSubtendedAngle(
        radiusKilometersByHorizonBody.sun,
        distanceSun,
      ),
    };
  }

  /**
   * Lunar eclipse geometry: the Moon's distance from the axis of Earth's
   * shadow, and the penumbral contact distance. The penumbra's radius is
   * 1.01·π☾ + π☉ + s☉ (Danjon), so the Moon's limb touches it at that plus s☾.
   */
  getLunarContactGeometry(
    coordinates: EclipseCoordinates,
  ): EclipseContactGeometry {
    const { moonParallax, moonSemidiameter, sunParallax, sunSemidiameter } =
      this.getDiscAngles(coordinates);

    return {
      contactLimit:
        DANJON_SHADOW_ENLARGEMENT * moonParallax +
        sunParallax +
        sunSemidiameter +
        moonSemidiameter,
      separation: EclipseGeometryService.getAngularSeparation(
        {
          latitude: coordinates.latitudeMoon,
          longitude: coordinates.longitudeMoon,
        },
        this.getAntisolarPoint(coordinates),
      ),
    };
  }

  /**
   * Solar eclipse geometry: the geocentric Sun–Moon separation, and the
   * separation at which the Moon's penumbra first or last touches Earth
   * (global P1/P4), π☾ − π☉ + s☉ + s☾.
   */
  getSolarContactGeometry(
    coordinates: EclipseCoordinates,
  ): EclipseContactGeometry {
    const { moonParallax, moonSemidiameter, sunParallax, sunSemidiameter } =
      this.getDiscAngles(coordinates);

    return {
      contactLimit:
        moonParallax - sunParallax + sunSemidiameter + moonSemidiameter,
      separation: EclipseGeometryService.getAngularSeparation(
        {
          latitude: coordinates.latitudeMoon,
          longitude: coordinates.longitudeMoon,
        },
        this.getSunPosition(coordinates),
      ),
    };
  }

  /** The Sun's position, which the Moon covers in a solar eclipse. */
  getSunPosition(coordinates: EclipseCoordinates): {
    latitude: number;
    longitude: number;
  } {
    return {
      latitude: coordinates.latitudeSun,
      longitude: coordinates.longitudeSun,
    };
  }

  /**
   * Solar eclipse geometry as one observer sees it: the topocentric Moon's
   * separation from the topocentric Sun, and the separation at which their
   * limbs touch (C1/C4), s☉ + s☾. The discs overlap while it is below that.
   */
  getTopocentricSolarContactGeometry(
    sample: TopocentricSample,
  ): EclipseContactGeometry {
    return {
      contactLimit: sample.sun.semidiameter + sample.moon.semidiameter,
      separation: EclipseGeometryService.getAngularSeparation(
        sample.moon,
        sample.sun,
      ),
    };
  }
}
