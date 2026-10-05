import { Injectable } from "@nestjs/common";

import {
  azimuthElevationBodies as allAzimuthElevationBodies,
  bodies as allBodies,
  diameterBodies as allDiameterBodies,
  distanceBodies as allDistanceBodies,
  illuminationBodies as allIlluminationBodies,
} from "../caelundas/caelundas.constants";
import { typedFromEntries } from "../caelundas/caelundas.types";

import { EphemerisAggregationService } from "./ephemeris-aggregation.service";
import { EphemerisConstantsService } from "./ephemeris-constants.service";
import { EphemerisCoordinateService } from "./ephemeris-coordinate.service";
import { EphemerisHorizonService } from "./ephemeris-horizon.service";
import { EphemerisPhenomenaService } from "./ephemeris-phenomena.service";
import { EphemerisTimeService } from "./ephemeris-time.service";
import { initializeSwissEphemeris } from "./ephemeris.constants";

import type { Body } from "../caelundas/caelundas.types";
import type {
  AzimuthElevationEphemeris,
  AzimuthElevationEphemerisBody,
  CoordinateEphemeris,
  Coordinates,
  DiameterEphemeris,
  DiameterEphemerisBody,
  DistanceEphemeris,
  DistanceEphemerisBody,
  IlluminationEphemeris,
  IlluminationEphemerisBody,
} from "./ephemeris.types";
import type { Moment } from "moment-timezone";

/**
 * Swiss Ephemeris computation orchestration service for caelundas.
 * Delegates coordinate, phenomena, and horizon computations to specialized sub-services.
 *
 * @see {@link ./ephemeris.constants#} for initialization and SE body constants
 * @see {@link ./ephemeris.types#} for data structures
 */
@Injectable()
export class EphemerisService {
  // 🏗 Dependency Injection

  constructor(
    private readonly ephemerisAggregationService: EphemerisAggregationService,
    private readonly ephemerisCoordinateService: EphemerisCoordinateService,
    private readonly ephemerisConstantsService: EphemerisConstantsService,
    private readonly ephemerisHorizonService: EphemerisHorizonService,
    private readonly ephemerisPhenomenaService: EphemerisPhenomenaService,
    private readonly ephemerisTimeService: EphemerisTimeService,
  ) {
    initializeSwissEphemeris();
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Returns the aggregation service.
   */
  private getAggregationService(): EphemerisAggregationService {
    return this.ephemerisAggregationService;
  }

  /**
   * Returns the constants service.
   */
  private getConstantsService(): EphemerisConstantsService {
    return this.ephemerisConstantsService;
  }

  /**
   * Returns the coordinate service.
   */
  private getCoordinateService(): EphemerisCoordinateService {
    return this.ephemerisCoordinateService;
  }

  /**
   * Returns the horizon service.
   */
  private getHorizonService(): EphemerisHorizonService {
    return this.ephemerisHorizonService;
  }

  /**
   * Returns the phenomena service.
   */
  private getPhenomenaService(): EphemerisPhenomenaService {
    return this.ephemerisPhenomenaService;
  }

  /**
   * Returns the time service.
   */
  private getTimeService(): EphemerisTimeService {
    return this.ephemerisTimeService;
  }

  // 🌎 Public Methods

  /**
   * Computes all five ephemeris types for all bodies in a single pass, eliminating
   * redundant calc() calls that would occur when each type is computed independently.
   *
   * Savings vs. Calling each get*EphemerisByBody function separately:
   * - Distance: extracted from the coordinate calc() result (data[2]) instead of a
   *   second calc() call — saves ~6,000 calc() calls/day for sun, mercury, venus, mars.
   * - Azimuth/elevation: reuses ecliptic coords from coordinate calc() result instead
   *   of a second calc() call before azalt() — saves ~3,000 calc() calls/day for sun, moon.
   * - Moon illumination + diameter: single pheno_ut() provides both data[1] (illumination
   *   fraction) and data[3] (apparent diameter) — saves ~1,500 pheno_ut() calls/day.
   * - Swiss Ephemeris constant lookup hoisted outside the minute loop per body.
   */
  public computeAllEphemerides(args: {
    azimuthElevationBodies: AzimuthElevationEphemerisBody[];
    coordinateBodies: Body[];
    coordinates: Coordinates;
    diameterBodies: DiameterEphemerisBody[];
    distanceBodies: DistanceEphemerisBody[];
    end: Moment;
    illuminationBodies: IlluminationEphemerisBody[];
    start: Moment;
  }): {
    azimuthElevationEphemerisByBody: Record<Body, AzimuthElevationEphemeris>;
    coordinateEphemerisByBody: Record<Body, CoordinateEphemeris>;
    diameterEphemerisByBody: Record<Body, DiameterEphemeris>;
    distanceEphemerisByBody: Record<Body, DistanceEphemeris>;
    illuminationEphemerisByBody: Record<Body, IlluminationEphemeris>;
  } {
    const {
      azimuthElevationBodies,
      coordinateBodies,
      coordinates,
      diameterBodies,
      distanceBodies,
      end,
      illuminationBodies,
      start,
    } = args;
    const [observerLongitude, observerLatitude] = coordinates;
    const aggregationService = this.getAggregationService();
    const featureSets = aggregationService.buildEphemerisFeatureSets({
      azimuthElevationBodies,
      diameterBodies,
      distanceBodies,
      illuminationBodies,
    });
    const allEntries = aggregationService.buildEphemerisEntries();
    for (const body of coordinateBodies) {
      aggregationService.accumulateBodyEphemeris({
        allEntries,
        body,
        end,
        featureSets,
        observerLatitude,
        observerLongitude,
        start,
      });
    }
    return aggregationService.entriesToEphemerides(allEntries);
  }

  /**
   * Computes minute-by-minute horizontal coordinates (azimuth, apparent elevation)
   * for the requested bodies at the observer's location.
   */
  public getAzimuthElevationEphemerisByBody(args: {
    bodies: AzimuthElevationEphemerisBody[];
    coordinates: Coordinates;
    end: Moment;
    start: Moment;
    timezone: string;
  }): Record<Body, AzimuthElevationEphemeris> {
    const { bodies, coordinates, end, start } = args;
    const [observerLongitude, observerLatitude] = coordinates;
    const entries: [Body, AzimuthElevationEphemeris][] = [];
    for (const body of bodies) {
      entries.push([
        body,
        this.getHorizonService().computeAzimuthElevationForBody({
          body,
          end,
          observerLatitude,
          observerLongitude,
          start,
        }),
      ]);
    }
    return typedFromEntries(entries);
  }

  /**
   * Safely extracts azimuth or elevation data from horizon coordinate ephemeris.
   *
   * @throws When timestamp or field is missing from ephemeris.
   */
  public getAzimuthElevationFromEphemeris(
    ephemeris: AzimuthElevationEphemeris,
    timestamp: string,
    fieldName: "azimuth" | "elevation",
  ): number {
    const data = ephemeris[timestamp];
    if (data?.[fieldName] === undefined) {
      throw new Error(`Missing ${fieldName} at ${timestamp}`);
    }
    return data[fieldName];
  }

  /**
   * Computes minute-by-minute ecliptic coordinates for all requested bodies.
   */
  public getCoordinateEphemerisByBody(args: {
    bodies: Body[];
    end: Moment;
    start: Moment;
    timezone: string;
  }): Record<Body, CoordinateEphemeris> {
    const { bodies, end, start } = args;
    const entries: [Body, CoordinateEphemeris][] = [];

    for (const body of bodies) {
      if (this.getConstantsService().isNode(body)) {
        entries.push([
          body,
          this.getCoordinateService().computeNodeBodyMinutes({
            body,
            end,
            start,
          }),
        ]);
        continue;
      }

      const ephemeris: CoordinateEphemeris = {};
      for (const date of this.getTimeService().generateMinutes(start, end)) {
        const { julianDayEphemerisTime } =
          this.getTimeService().dateToJulianDays(date);
        ephemeris[date.toISOString()] =
          this.getCoordinateService().computeBodyCoordinate(
            body,
            julianDayEphemerisTime,
          );
      }
      entries.push([body, ephemeris]);
    }

    return typedFromEntries(entries);
  }

  /**
   * Safely extracts coordinate data (longitude or latitude) from ephemeris at a timestamp.
   *
   * @throws When timestamp or field is missing from ephemeris.
   */
  public getCoordinateFromEphemeris(
    ephemeris: CoordinateEphemeris,
    timestamp: string,
    fieldName: "latitude" | "longitude",
  ): number {
    const data = ephemeris[timestamp];
    if (data?.[fieldName] === undefined) {
      throw new Error(`Missing ${fieldName} at ${timestamp}`);
    }
    return data[fieldName];
  }

  /**
   * Computes minute-by-minute apparent angular diameter for the requested bodies.
   * pheno_ut() returns apparent diameter in degrees.
   */
  public getDiameterEphemerisByBody(args: {
    bodies: DiameterEphemerisBody[];
    end: Moment;
    start: Moment;
    timezone: string;
  }): Record<Body, DiameterEphemeris> {
    const { bodies, end, start } = args;
    const entries: [Body, DiameterEphemeris][] = [];

    for (const body of bodies) {
      entries.push([
        body,
        this.getPhenomenaService().computeDiameterForBody({
          body,
          end,
          start,
        }),
      ]);
    }

    return typedFromEntries(entries);
  }

  /**
   * Safely extracts angular diameter from ephemeris.
   *
   * @throws When timestamp or field is missing from ephemeris.
   */
  public getDiameterFromEphemeris(
    ephemeris: DiameterEphemeris,
    timestamp: string,
    fieldName: string,
  ): number {
    const data = ephemeris[timestamp];
    if (data?.diameter === undefined) {
      throw new Error(`Missing ${fieldName} at ${timestamp}`);
    }
    return data.diameter;
  }

  /**
   * Computes minute-by-minute geocentric distance for the requested bodies.
   */
  public getDistanceEphemerisByBody(args: {
    bodies: DistanceEphemerisBody[];
    end: Moment;
    start: Moment;
    timezone: string;
  }): Record<Body, DistanceEphemeris> {
    const { bodies, end, start } = args;
    const entries: [Body, DistanceEphemeris][] = [];

    for (const body of bodies) {
      entries.push([
        body,
        this.getCoordinateService().computeDistanceForBody({
          body,
          end,
          start,
        }),
      ]);
    }

    return typedFromEntries(entries);
  }

  /**
   * Safely extracts distance from Earth from ephemeris.
   *
   * @throws When timestamp or field is missing from ephemeris.
   */
  public getDistanceFromEphemeris(
    ephemeris: DistanceEphemeris,
    timestamp: string,
    fieldName: string,
  ): number {
    const data = ephemeris[timestamp];
    if (data?.distance === undefined) {
      throw new Error(`Missing ${fieldName} at ${timestamp}`);
    }
    return data.distance;
  }

  /**
   * Aggregates all ephemeris data types for all relevant bodies across a date range.
   */
  public getEphemerides(args: {
    coordinates: Coordinates;
    end: Moment;
    start: Moment;
    timezone: string;
  }): {
    azimuthElevationEphemerisByBody: Record<Body, AzimuthElevationEphemeris>;
    coordinateEphemerisByBody: Record<Body, CoordinateEphemeris>;
    diameterEphemerisByBody: Record<Body, DiameterEphemeris>;
    distanceEphemerisByBody: Record<Body, DistanceEphemeris>;
    illuminationEphemerisByBody: Record<Body, IlluminationEphemeris>;
  } {
    const { coordinates, end, start } = args;

    return this.computeAllEphemerides({
      azimuthElevationBodies: allAzimuthElevationBodies,
      coordinateBodies: allBodies,
      coordinates,
      diameterBodies: allDiameterBodies,
      distanceBodies: allDistanceBodies,
      end,
      illuminationBodies: allIlluminationBodies,
      start,
    });
  }

  /**
   * Computes per-body illumination series for the requested range.
   */
  public getIlluminationEphemerisByBody(args: {
    bodies: IlluminationEphemerisBody[];
    coordinates: Coordinates;
    end: Moment;
    start: Moment;
    timezone: string;
  }): Record<Body, IlluminationEphemeris> {
    const { bodies, end, start } = args;
    const entries: [Body, IlluminationEphemeris][] = [];
    for (const body of bodies) {
      entries.push([
        body,
        this.getPhenomenaService().computeIlluminationForBody({
          body,
          end,
          start,
        }),
      ]);
    }
    return typedFromEntries(entries);
  }

  /**
   * Safely extracts illumination fraction from ephemeris.
   *
   * @throws When timestamp or field is missing from ephemeris.
   */
  public getIlluminationFromEphemeris(
    ephemeris: IlluminationEphemeris,
    timestamp: string,
    fieldName: string,
  ): number {
    const data = ephemeris[timestamp];
    if (data?.illumination === undefined) {
      throw new Error(`Missing ${fieldName} at ${timestamp}`);
    }
    return data.illumination;
  }

  /**
   * Extracts the ecliptic longitude for a body at the previous, current, and next minute.
   *
   * Convenience wrapper around {@link getCoordinateFromEphemeris} that fetches all three
   * minute-window positions in a single call, reducing the six individual calls required
   * by aspect phase detection into two.
   *
   * @throws When any of the three timestamps are missing from the ephemeris.
   */
  public getLongitudesWindow(args: {
    ephemeris: CoordinateEphemeris;
    minute: Moment;
    next: Moment;
    previous: Moment;
  }): { current: number; next: number; previous: number } {
    const { ephemeris, minute, next, previous } = args;
    return {
      current: this.getCoordinateFromEphemeris(
        ephemeris,
        minute.toISOString(),
        "longitude",
      ),
      next: this.getCoordinateFromEphemeris(
        ephemeris,
        next.toISOString(),
        "longitude",
      ),
      previous: this.getCoordinateFromEphemeris(
        ephemeris,
        previous.toISOString(),
        "longitude",
      ),
    };
  }
}
