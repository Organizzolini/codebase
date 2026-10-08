// 🏷️ Types
import type {
  CoordinateEphemeris,
  CoordinateEphemerisBody,
  DistanceEphemeris,
  DistanceEphemerisBody,
  IlluminationEphemeris,
  IlluminationEphemerisBody,
} from "../ephemeris/ephemeris.types";
import type { Moment } from "moment-timezone";

/** Arguments used to compute scalar brightness. */
export interface BrightnessArguments {
  distance: number;
  illumination: number;
}

/** Arguments used to compute brightness arrays and extrema inputs. */
export interface BrightnessesArguments {
  currentDistance: number;
  currentIllumination: number;
  nextDistances: number[];
  nextIlluminations: number[];
  previousDistances: number[];
  previousIlluminations: number[];
}

/** Combined longitude and brightness arguments for brightest-in-direction checks. */
export interface BrightnessLongitudeArguments
  extends BrightnessesArguments, CurrentLongitudeArguments {}

/** Arguments to emit a planet phase event. */
export interface BuildPlanetPhaseEventArguments<TPhase extends string> {
  phase: TPhase;
  timestamp: Moment;
}

/** Arguments containing current planet/sun longitudes. */
export interface CurrentLongitudeArguments {
  currentLongitudePlanet: number;
  currentLongitudeSun: number;
}

/** Arguments used to detect per-planet events from per-minute ephemeris maps. */
export interface DetectPlanetaryEventsArguments {
  coordinateEphemerisByBody: Record<
    CoordinateEphemerisBody,
    CoordinateEphemeris
  >;
  distanceEphemerisByBody: Record<DistanceEphemerisBody, DistanceEphemeris>;
  illuminationEphemerisByBody: Record<
    IlluminationEphemerisBody,
    IlluminationEphemeris
  >;
  minute: Moment;
}

/** Arguments containing previous/current/next longitudes for elongation. */
export interface ElongationLongitudeArguments {
  currentLongitudePlanet: number;
  currentLongitudeSun: number;
  nextLongitudePlanet: number;
  nextLongitudeSun: number;
  previousLongitudePlanet: number;
  previousLongitudeSun: number;
}

/** Arguments used to sample current ephemeris values. */
export interface GatherCurrentEphemerisArguments {
  distanceEphemeris: DistanceEphemeris;
  illuminationEphemeris: IlluminationEphemeris;
  isoNow: string;
  planetCoordinateEphemeris: CoordinateEphemeris;
  sunCoordinateEphemeris: CoordinateEphemeris;
}

/** Arguments used to sample next/previous margin ephemeris arrays. */
export interface GatherMarginEphemerisArguments {
  direction: MarginDirection;
  distanceEphemeris: DistanceEphemeris;
  illuminationEphemeris: IlluminationEphemeris;
  minute: Moment;
}

/** Arguments used to gather complete phase parameters for one planet. */
export interface GatherPhaseParametersArguments {
  distanceEphemeris: DistanceEphemeris;
  illuminationEphemeris: IlluminationEphemeris;
  minute: Moment;
  planetCoordinateEphemeris: CoordinateEphemeris;
  sunCoordinateEphemeris: CoordinateEphemeris;
}

/** Direction for sampling margin windows around a minute. */
export type MarginDirection = "next" | "previous";

/** Margin array sample for distance and illumination. */
export interface MarginEphemerisSample {
  distances: number[];
  illuminations: number[];
}

/** Arguments used to compute per-minute Martian phase events. */
export interface MartianPhaseEventArguments {
  marsCoordinateEphemeris: CoordinateEphemeris;
  marsDistanceEphemeris: DistanceEphemeris;
  marsIlluminationEphemeris: IlluminationEphemeris;
  minute: Moment;
  sunCoordinateEphemeris: CoordinateEphemeris;
}

/** Arguments used to compute per-minute Mercurian phase events. */
export interface MercurianPhaseEventArguments {
  mercuryCoordinateEphemeris: CoordinateEphemeris;
  mercuryDistanceEphemeris: DistanceEphemeris;
  mercuryIlluminationEphemeris: IlluminationEphemeris;
  minute: Moment;
  sunCoordinateEphemeris: CoordinateEphemeris;
}

/**
 * Sliding-window scalar values consumed by phase checks (rise/set, elongation, brightness).
 */
export interface PhaseParameters {
  currentDistance: number;
  currentIllumination: number;
  currentLongitudePlanet: number;
  currentLongitudeSun: number;
  nextDistances: number[];
  nextIlluminations: number[];
  nextLongitudePlanet: number;
  nextLongitudeSun: number;
  previousDistances: number[];
  previousIlluminations: number[];
  previousLongitudePlanet: number;
  previousLongitudeSun: number;
}

/** Arguments containing previous/current longitudes for rise/set. */
export interface RiseSetLongitudeArguments {
  currentLongitudePlanet: number;
  currentLongitudeSun: number;
  previousLongitudePlanet: number;
  previousLongitudeSun: number;
}

/** Arguments used to compute per-minute Venusian phase events. */
export interface VenusianPhaseEventArguments {
  minute: Moment;
  sunCoordinateEphemeris: CoordinateEphemeris;
  venusCoordinateEphemeris: CoordinateEphemeris;
  venusDistanceEphemeris: DistanceEphemeris;
  venusIlluminationEphemeris: IlluminationEphemeris;
}
