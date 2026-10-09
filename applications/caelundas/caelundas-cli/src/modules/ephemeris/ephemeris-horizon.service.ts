import { Injectable } from "@nestjs/common";
import { azalt } from "sweph";

import { EphemerisCoordinateService } from "./ephemeris-coordinate.service";
import { EphemerisTimeService } from "./ephemeris-time.service";
import {
  ECLIPTIC_TO_HORIZONTAL_FLAG,
  KILOMETERS_PER_ASTRONOMICAL_UNIT,
  radiusKilometersByHorizonBody,
} from "./ephemeris.constants";

import type {
  AzimuthElevationEphemeris,
  AzimuthElevationEphemerisBody,
  HorizonPosition,
} from "./ephemeris.types";
import type { Moment } from "moment-timezone";

/**
 * Horizontal coordinate (azimuth, elevation) calculations for observer-relative positions.
 */
@Injectable()
export class EphemerisHorizonService {
  // 🏗 Dependency Injection

  constructor(
    private readonly coordinate: EphemerisCoordinateService,
    private readonly time: EphemerisTimeService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Computes minute-by-minute horizontal coordinates (azimuth, apparent elevation)
   * for a single body at the observer's location.
   *
   * Azimuth is measured from North clockwise (0° = North, 90° = East, 180° = South, 270° = West).
   * Elevation is the angle above the horizon (0° = horizon, positive = above, negative = below).
   */
  public computeAzimuthElevationForBody(args: {
    body: AzimuthElevationEphemerisBody;
    end: Moment;
    observerLatitude: number;
    observerLongitude: number;
    start: Moment;
  }): AzimuthElevationEphemeris {
    const { body, end, observerLatitude, observerLongitude, start } = args;
    const ephemeris: AzimuthElevationEphemeris = {};
    for (const date of this.time.generateMinutes(start, end)) {
      const { julianDayEphemerisTime, julianDayUniversalTime } =
        this.time.dateToJulianDays(date);
      ephemeris[date.toISOString()] = this.computeAzimuthElevationForMinute({
        body,
        julianDayEphemerisTime,
        julianDayUniversalTime,
        observerLatitude,
        observerLongitude,
      });
    }
    return ephemeris;
  }

  /**
   * Computes horizontal coordinates for a single body at a specific moment, from its
   * topocentric position: parallax is applied, so the Moon sits where the observer sees it.
   * Returns azimuth, apparent and true elevation, the topocentric ecliptic position
   * and the topocentric semidiameter. Swiss Ephemeris measures azimuth from South,
   * so it is turned half a circle to measure from North.
   */
  public computeAzimuthElevationForMinute(args: {
    body: AzimuthElevationEphemerisBody;
    julianDayEphemerisTime: number;
    julianDayUniversalTime: number;
    observerLatitude: number;
    observerLongitude: number;
  }): HorizonPosition {
    const {
      body,
      julianDayEphemerisTime,
      julianDayUniversalTime,
      observerLatitude,
      observerLongitude,
    } = args;
    const { distance, latitude, longitude } =
      this.coordinate.getTopocentricBodyCoordinates({
        body,
        julianDayEphemerisTime,
        observerLatitude,
        observerLongitude,
      });
    const azaltResult = azalt(
      julianDayUniversalTime,
      ECLIPTIC_TO_HORIZONTAL_FLAG,
      [observerLongitude, observerLatitude, 0],
      0,
      0,
      [longitude, latitude, distance],
    );
    return {
      azimuth: (azaltResult[0] + 180) % 360,
      eclipticLatitude: latitude,
      eclipticLongitude: longitude,
      elevation: azaltResult[2],
      semidiameter: this.computeSemidiameter({ body, distance }),
      trueElevation: azaltResult[1],
    };
  }

  /**
   * Computes the Sun's or the Moon's angular radius, in degrees, from its distance in AU.
   */
  public computeSemidiameter(args: {
    body: AzimuthElevationEphemerisBody;
    distance: number;
  }): number {
    const { body, distance } = args;
    const radius = radiusKilometersByHorizonBody[body];
    const distanceKilometers = distance * KILOMETERS_PER_ASTRONOMICAL_UNIT;
    return (Math.asin(radius / distanceKilometers) * 180) / Math.PI;
  }
}
