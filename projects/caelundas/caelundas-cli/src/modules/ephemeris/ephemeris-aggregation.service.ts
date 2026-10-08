import { Injectable } from "@nestjs/common";

import { typedFromEntries } from "../caelundas/caelundas.types";

import { EphemerisConstantsService } from "./ephemeris-constants.service";
import { EphemerisCoordinateService } from "./ephemeris-coordinate.service";
import { EphemerisHorizonService } from "./ephemeris-horizon.service";
import { EphemerisPhenomenaService } from "./ephemeris-phenomena.service";
import { EphemerisTimeService } from "./ephemeris-time.service";

import type { Body, Node } from "../caelundas/caelundas.types";
import type {
  AzimuthElevationEphemeris,
  AzimuthElevationEphemerisBody,
  CoordinateEphemeris,
  DiameterEphemeris,
  DiameterEphemerisBody,
  DistanceEphemeris,
  DistanceEphemerisBody,
  IlluminationEphemeris,
  IlluminationEphemerisBody,
} from "./ephemeris.types";
import type {
  EphemerisAccumulators,
  EphemerisEntries,
  EphemerisFeatureSets,
  NonNodeBodyMinuteProcessingArguments,
} from "./internal-ephemeris.types";
import type { Moment } from "moment-timezone";

/**
 * Single-pass multi-feature ephemeris aggregation orchestrator.
 * Coordinates coordinate, phenomena, and horizon computations for optimal efficiency.
 */
@Injectable()
export class EphemerisAggregationService {
  // 🏗 Dependency Injection

  constructor(
    private readonly constant: EphemerisConstantsService,
    private readonly coordinate: EphemerisCoordinateService,
    private readonly horizon: EphemerisHorizonService,
    private readonly phenomena: EphemerisPhenomenaService,
    private readonly time: EphemerisTimeService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Computes minute-by-minute ephemeris for a single non-node body.
   * Performs single-pass aggregation of coordinate, azimuth, illumination, and diameter data.
   */
  private computeNonNodeBodyMinutes(args: {
    body: Exclude<Body, Node>;
    end: Moment;
    needsAzimuth: boolean;
    needsDiameter: boolean;
    needsDistance: boolean;
    needsIllumination: boolean;
    observerLatitude: number;
    observerLongitude: number;
    start: Moment;
    swissEphemerisConstant: number;
  }): EphemerisAccumulators {
    const {
      body,
      end,
      needsAzimuth,
      needsDiameter,
      needsDistance,
      needsIllumination,
      observerLatitude,
      observerLongitude,
      start,
      swissEphemerisConstant,
    } = args;
    const accumulators: EphemerisAccumulators = {
      azimuthElevationEphemeris: {},
      coordinateEphemeris: {},
      diameterEphemeris: {},
      distanceEphemeris: {},
      illuminationEphemeris: {},
    };
    for (const date of this.time.generateMinutes(start, end)) {
      this.processNonNodeBodyMinute({
        accumulators,
        body,
        date,
        needsAzimuth,
        needsDiameter,
        needsDistance,
        needsIllumination,
        observerLatitude,
        observerLongitude,
        swissEphemerisConstant,
      });
    }
    return accumulators;
  }

  /**
   * Processes a single minute of non-node body data.
   * Computes coordinates, distance, azimuth/elevation, and illumination/diameter as requested.
   */
  private processNonNodeBodyMinute(
    args: NonNodeBodyMinuteProcessingArguments,
  ): void {
    const {
      accumulators,
      body,
      date,
      needsAzimuth,
      needsDiameter,
      needsDistance,
      needsIllumination,
      observerLatitude,
      observerLongitude,
      swissEphemerisConstant,
    } = args;
    const { julianDayEphemerisTime, julianDayUniversalTime } =
      this.time.dateToJulianDays(date);
    const timestamp = date.toISOString();
    const { distance, latitude, longitude } =
      this.coordinate.getBodyCoordinatesWithDistance(
        body,
        julianDayEphemerisTime,
      );
    accumulators.coordinateEphemeris[timestamp] = { latitude, longitude };
    if (needsDistance) accumulators.distanceEphemeris[timestamp] = { distance };
    if (needsAzimuth) {
      accumulators.azimuthElevationEphemeris[timestamp] =
        this.horizon.computeAzimuthElevationForMinute({
          body,
          distance,
          julianDayUniversalTime,
          latitude,
          longitude,
          observerLatitude,
          observerLongitude,
        });
    }
    if (needsIllumination || needsDiameter) {
      this.phenomena.computePhenoForMinute({
        body,
        diameterEphemeris: accumulators.diameterEphemeris,
        illuminationEphemeris: accumulators.illuminationEphemeris,
        julianDayUniversalTime,
        needsDiameter,
        needsIllumination,
        swissEphemerisConstant,
        timestamp,
      });
    }
  }

  // 🌎 Public Methods

  /**
   * Accumulates ephemeris data for a single body across the date range.
   * Dispatches to node or non-node handlers based on body classification.
   * Collects results into the shared ephemeris entries list.
   */
  public accumulateBodyEphemeris(args: {
    allEntries: EphemerisEntries;
    body: Body;
    end: Moment;
    featureSets: EphemerisFeatureSets;
    observerLatitude: number;
    observerLongitude: number;
    start: Moment;
  }): void {
    const {
      allEntries,
      body,
      end,
      featureSets,
      observerLatitude,
      observerLongitude,
      start,
    } = args;
    if (this.constant.isNode(body)) {
      allEntries.coordinateEntries.push([
        body,
        this.coordinate.computeNodeBodyMinutes({ body, end, start }),
      ]);
      return;
    }
    const needsAzimuth = featureSets.azimuthElevationSet.has(body);
    const needsIllumination = featureSets.illuminationSet.has(body);
    const needsDiameter = featureSets.diameterSet.has(body);
    const needsDistance = featureSets.distanceSet.has(body);
    const swissEphemerisConstant =
      this.constant.getSwissEphemerisConstantForBody(body);
    const result = this.computeNonNodeBodyMinutes({
      body,
      end,
      needsAzimuth,
      needsDiameter,
      needsDistance,
      needsIllumination,
      observerLatitude,
      observerLongitude,
      start,
      swissEphemerisConstant,
    });
    allEntries.coordinateEntries.push([body, result.coordinateEphemeris]);
    if (needsAzimuth)
      allEntries.azimuthEntries.push([body, result.azimuthElevationEphemeris]);
    if (needsIllumination)
      allEntries.illuminationEntries.push([body, result.illuminationEphemeris]);
    if (needsDiameter)
      allEntries.diameterEntries.push([body, result.diameterEphemeris]);
    if (needsDistance)
      allEntries.distanceEntries.push([body, result.distanceEphemeris]);
  }

  /**
   * Creates empty entry lists for each ephemeris type.
   * Used during single-pass accumulation before final conversion to by-body maps.
   */
  public buildEphemerisEntries(): EphemerisEntries {
    return {
      azimuthEntries: [],
      coordinateEntries: [],
      diameterEntries: [],
      distanceEntries: [],
      illuminationEntries: [],
    };
  }

  /**
   * Builds feature request sets from requested body lists.
   * Used to skip unnecessary computations during single-pass aggregation.
   */
  public buildEphemerisFeatureSets(args: {
    azimuthElevationBodies: AzimuthElevationEphemerisBody[];
    diameterBodies: DiameterEphemerisBody[];
    distanceBodies: DistanceEphemerisBody[];
    illuminationBodies: IlluminationEphemerisBody[];
  }): EphemerisFeatureSets {
    const {
      azimuthElevationBodies,
      diameterBodies,
      distanceBodies,
      illuminationBodies,
    } = args;
    return {
      azimuthElevationSet: new Set<Body>(azimuthElevationBodies),
      diameterSet: new Set<Body>(diameterBodies),
      distanceSet: new Set<Body>(distanceBodies),
      illuminationSet: new Set<Body>(illuminationBodies),
    };
  }

  /**
   * Converts collected entries (per-type tuple arrays) to per-body maps.
   */
  public entriesToEphemerides(allEntries: EphemerisEntries): {
    azimuthElevationEphemerisByBody: Record<Body, AzimuthElevationEphemeris>;
    coordinateEphemerisByBody: Record<Body, CoordinateEphemeris>;
    diameterEphemerisByBody: Record<Body, DiameterEphemeris>;
    distanceEphemerisByBody: Record<Body, DistanceEphemeris>;
    illuminationEphemerisByBody: Record<Body, IlluminationEphemeris>;
  } {
    return {
      azimuthElevationEphemerisByBody: typedFromEntries(
        allEntries.azimuthEntries,
      ),
      coordinateEphemerisByBody: typedFromEntries(allEntries.coordinateEntries),
      diameterEphemerisByBody: typedFromEntries(allEntries.diameterEntries),
      distanceEphemerisByBody: typedFromEntries(allEntries.distanceEntries),
      illuminationEphemerisByBody: typedFromEntries(
        allEntries.illuminationEntries,
      ),
    };
  }
}
