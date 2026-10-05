import { Injectable } from "@nestjs/common";
import { azalt } from "sweph";

import { EphemerisCoordinateService } from "./ephemeris-coordinate.service";
import { EphemerisTimeService } from "./ephemeris-time.service";
import { ECLIPTIC_TO_HORIZONTAL_FLAG } from "./ephemeris.constants";

import type { Body, Node } from "../caelundas/caelundas.types";
import type {
  AzimuthElevationEphemeris,
  AzimuthElevationEphemerisBody,
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
      const { distance, latitude, longitude } =
        this.coordinate.getBodyCoordinatesWithDistance(
          body,
          julianDayEphemerisTime,
        );
      ephemeris[date.toISOString()] = this.computeAzimuthElevationForMinute({
        body,
        distance,
        julianDayUniversalTime,
        latitude,
        longitude,
        observerLatitude,
        observerLongitude,
      });
    }
    return ephemeris;
  }

  /**
   * Computes horizontal coordinates (azimuth, elevation) for a single body at a specific moment.
   * Used internally by aggregation service. Returns azimuth and elevation angles.
   */
  public computeAzimuthElevationForMinute(args: {
    body: Exclude<Body, Node>;
    distance: number;
    julianDayUniversalTime: number;
    latitude: number;
    longitude: number;
    observerLatitude: number;
    observerLongitude: number;
  }): { azimuth: number; elevation: number } {
    const {
      distance,
      julianDayUniversalTime,
      latitude,
      longitude,
      observerLatitude,
      observerLongitude,
    } = args;
    const azaltResult = azalt(
      julianDayUniversalTime,
      ECLIPTIC_TO_HORIZONTAL_FLAG,
      [observerLongitude, observerLatitude, 0],
      0,
      0,
      [longitude, latitude, distance],
    );
    return { azimuth: azaltResult[0], elevation: azaltResult[2] };
  }
}
