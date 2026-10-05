import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logger";

import { EphemerisService } from "../ephemeris/ephemeris.service";
import { MathService } from "../math/math.service";

import type {
  AzimuthElevationEphemeris,
  CoordinateEphemeris,
  DiameterEphemeris,
} from "../ephemeris/ephemeris.types";
import type { EclipseCoordinates } from "./eclipses.types";
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
    private readonly mathService: MathService,
  ) {
    this.logger.setContext(EclipseGeometryService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Derives eclipse coordinate diameters.
   */
  private getEclipseCoordinateDiameters(
    minuteIso: string,
    moonDiameterEphemeris: DiameterEphemeris,
    sunDiameterEphemeris: DiameterEphemeris,
  ): { diameterMoon: number; diameterSun: number } {
    return {
      diameterMoon: this.ephemerisService.getDiameterFromEphemeris(
        moonDiameterEphemeris,
        minuteIso,
        "currentDiameterMoon",
      ),
      diameterSun: this.ephemerisService.getDiameterFromEphemeris(
        sunDiameterEphemeris,
        minuteIso,
        "currentDiameterSun",
      ),
    };
  }

  /**
   * Derives eclipse coordinate latitudes and longitudes.
   */
  private getEclipseCoordinateLatitudesAndLongitudes(
    minuteIso: string,
    moonCoordinateEphemeris: CoordinateEphemeris,
    sunCoordinateEphemeris: CoordinateEphemeris,
  ): {
    latitudeMoon: number;
    latitudeSun: number;
    longitudeMoon: number;
    longitudeSun: number;
  } {
    return {
      latitudeMoon: this.ephemerisService.getCoordinateFromEphemeris(
        moonCoordinateEphemeris,
        minuteIso,
        "latitude",
      ),
      latitudeSun: this.ephemerisService.getCoordinateFromEphemeris(
        sunCoordinateEphemeris,
        minuteIso,
        "latitude",
      ),
      longitudeMoon: this.ephemerisService.getCoordinateFromEphemeris(
        moonCoordinateEphemeris,
        minuteIso,
        "longitude",
      ),
      longitudeSun: this.ephemerisService.getCoordinateFromEphemeris(
        sunCoordinateEphemeris,
        minuteIso,
        "longitude",
      ),
    };
  }

  /**
   * Derives eclipse coordinates.
   */
  private getEclipseCoordinates(args: {
    minuteIso: string;
    moonCoordinateEphemeris: CoordinateEphemeris;
    moonDiameterEphemeris: DiameterEphemeris;
    sunCoordinateEphemeris: CoordinateEphemeris;
    sunDiameterEphemeris: DiameterEphemeris;
  }): EclipseCoordinates {
    const {
      minuteIso,
      moonCoordinateEphemeris,
      moonDiameterEphemeris,
      sunCoordinateEphemeris,
      sunDiameterEphemeris,
    } = args;

    return {
      ...this.getEclipseCoordinateDiameters(
        minuteIso,
        moonDiameterEphemeris,
        sunDiameterEphemeris,
      ),
      ...this.getEclipseCoordinateLatitudesAndLongitudes(
        minuteIso,
        moonCoordinateEphemeris,
        sunCoordinateEphemeris,
      ),
    };
  }

  /**
   * Derives topocentric visibility for a single minute.
   */
  private getTopocentricVisibility(args: {
    minuteIso: string;
    moonAzimuthElevationEphemeris: AzimuthElevationEphemeris;
    sunAzimuthElevationEphemeris: AzimuthElevationEphemeris;
  }): { isLunarVisible: boolean; isSolarVisible: boolean } {
    const {
      minuteIso,
      moonAzimuthElevationEphemeris,
      sunAzimuthElevationEphemeris,
    } = args;

    const moonElevation =
      this.ephemerisService.getAzimuthElevationFromEphemeris(
        moonAzimuthElevationEphemeris,
        minuteIso,
        "elevation",
      );
    const sunElevation = this.ephemerisService.getAzimuthElevationFromEphemeris(
      sunAzimuthElevationEphemeris,
      minuteIso,
      "elevation",
    );

    return {
      isLunarVisible: moonElevation > 0,
      isSolarVisible: sunElevation > 0 && moonElevation > 0,
    };
  }

  // 🌎 Public Methods

  /**
   * Derives all eclipse coordinates around the current minute.
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
    const minuteIso = args.minute.toISOString();
    const previousIso = args.minute.clone().subtract(1, "minute").toISOString();
    const nextIso = args.minute.clone().add(1, "minute").toISOString();

    const common = {
      moonCoordinateEphemeris: args.moonCoordinateEphemeris,
      moonDiameterEphemeris: args.moonDiameterEphemeris,
      sunCoordinateEphemeris: args.sunCoordinateEphemeris,
      sunDiameterEphemeris: args.sunDiameterEphemeris,
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
   * Derives all topocentric visibilities around the current minute.
   */
  getAllTopocentricVisibilities(args: {
    minute: Moment;
    moonAzimuthElevationEphemeris: AzimuthElevationEphemeris;
    sunAzimuthElevationEphemeris: AzimuthElevationEphemeris;
  }): {
    currentVisibility: { isLunarVisible: boolean; isSolarVisible: boolean };
    nextVisibility: { isLunarVisible: boolean; isSolarVisible: boolean };
    previousVisibility: { isLunarVisible: boolean; isSolarVisible: boolean };
  } {
    const minuteIso = args.minute.toISOString();
    const previousIso = args.minute.clone().subtract(1, "minute").toISOString();
    const nextIso = args.minute.clone().add(1, "minute").toISOString();

    const common = {
      moonAzimuthElevationEphemeris: args.moonAzimuthElevationEphemeris,
      sunAzimuthElevationEphemeris: args.sunAzimuthElevationEphemeris,
    };

    return {
      currentVisibility: this.getTopocentricVisibility({
        minuteIso,
        ...common,
      }),
      nextVisibility: this.getTopocentricVisibility({
        minuteIso: nextIso,
        ...common,
      }),
      previousVisibility: this.getTopocentricVisibility({
        minuteIso: previousIso,
        ...common,
      }),
    };
  }

  /**
   * Derives eclipse geometry angles.
   */
  getEclipseAngles(
    current: EclipseCoordinates,
    previous: EclipseCoordinates,
    next: EclipseCoordinates,
  ): {
    currentDiameter: number;
    currentLatitudeAngle: number;
    currentLongitudeAngle: number;
    nextLongitudeAngle: number;
    previousLongitudeAngle: number;
  } {
    return {
      currentDiameter: current.diameterSun + current.diameterMoon,
      currentLatitudeAngle: this.mathService.getAngle(
        current.latitudeMoon,
        current.latitudeSun,
      ),
      currentLongitudeAngle: this.mathService.getAngle(
        current.longitudeMoon,
        current.longitudeSun,
      ),
      nextLongitudeAngle: this.mathService.getAngle(
        next.longitudeMoon,
        next.longitudeSun,
      ),
      previousLongitudeAngle: this.mathService.getAngle(
        previous.longitudeMoon,
        previous.longitudeSun,
      ),
    };
  }
}
