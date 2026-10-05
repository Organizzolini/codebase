import type { Body, Node } from "../caelundas/caelundas.types";
import type {
  AzimuthElevationEphemeris,
  CoordinateEphemeris,
  DiameterEphemeris,
  DistanceEphemeris,
  IlluminationEphemeris,
} from "./ephemeris.types";
import type { Moment } from "moment-timezone";

/**
 * Accumulated minute-by-minute ephemeris data for a single body across a date range.
 * Populated incrementally before final conversion to result maps.
 */
export interface EphemerisAccumulators {
  readonly azimuthElevationEphemeris: AzimuthElevationEphemeris;
  readonly coordinateEphemeris: CoordinateEphemeris;
  readonly diameterEphemeris: DiameterEphemeris;
  readonly distanceEphemeris: DistanceEphemeris;
  readonly illuminationEphemeris: IlluminationEphemeris;
}

/**
 * Tuples collected during single-pass computation, later converted to by-body maps.
 */
export interface EphemerisEntries {
  readonly azimuthEntries: [Body, AzimuthElevationEphemeris][];
  readonly coordinateEntries: [Body, CoordinateEphemeris][];
  readonly diameterEntries: [Body, DiameterEphemeris][];
  readonly distanceEntries: [Body, DistanceEphemeris][];
  readonly illuminationEntries: [Body, IlluminationEphemeris][];
}

/**
 * Sets marking which bodies require each ephemeris feature.
 * Used internally to skip unnecessary computations during single-pass aggregation.
 */
export interface EphemerisFeatureSets {
  readonly azimuthElevationSet: Set<Body>;
  readonly diameterSet: Set<Body>;
  readonly distanceSet: Set<Body>;
  readonly illuminationSet: Set<Body>;
}

/**
 * Result of converting a UTC date to Julian Day numbers.
 */
export interface JulianDays {
  readonly julianDayEphemerisTime: number;
  readonly julianDayUniversalTime: number;
}

/**
 * Arguments for minute-level coordinate and feature computations.
 */
export interface NonNodeBodyMinuteProcessingArguments {
  readonly accumulators: EphemerisAccumulators;
  readonly body: Exclude<Body, Node>;
  readonly date: Moment;
  readonly needsAzimuth: boolean;
  readonly needsDiameter: boolean;
  readonly needsDistance: boolean;
  readonly needsIllumination: boolean;
  readonly observerLatitude: number;
  readonly observerLongitude: number;
  readonly swissEphemerisConstant: number;
}
