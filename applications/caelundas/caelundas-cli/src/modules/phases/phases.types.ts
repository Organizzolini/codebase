// 🏷️ Types
import type {
  CoordinateEphemeris,
  CoordinateEphemerisBody,
  IlluminationEphemeris,
  IlluminationEphemerisBody,
} from "../ephemeris/ephemeris.types";
import type { Moment } from "moment-timezone";

/**
 * Apparent magnitudes at the current minute and across its margins, with the
 * current phase angle and positions that decide whether the planet is visible.
 *
 * Greatest brilliancy is the least magnitude, so a minute is brightest when
 * every margin sample either side of it reads a larger magnitude.
 */
export interface BrightnessesArguments {
  currentLatitudePlanet: number;
  currentLatitudeSun: number;
  currentLongitudePlanet: number;
  currentLongitudeSun: number;
  currentMagnitude: number;
  currentPhaseAngle: number;
  nextMagnitudes: number[];
  previousMagnitudes: number[];
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
  illuminationEphemerisByBody: Record<
    IlluminationEphemerisBody,
    IlluminationEphemeris
  >;
  minute: Moment;
}

/**
 * Arguments containing previous/current/next ecliptic positions for elongation.
 *
 * Latitudes are carried alongside longitudes because greatest elongation is
 * the maximum of the true angular separation from the Sun, not of the
 * longitude gap.
 */
export interface ElongationLongitudeArguments {
  currentLatitudePlanet: number;
  currentLatitudeSun: number;
  currentLongitudePlanet: number;
  currentLongitudeSun: number;
  nextLatitudePlanet: number;
  nextLatitudeSun: number;
  nextLongitudePlanet: number;
  nextLongitudeSun: number;
  previousLatitudePlanet: number;
  previousLatitudeSun: number;
  previousLongitudePlanet: number;
  previousLongitudeSun: number;
}

/** Arguments used to sample current ephemeris values. */
export interface GatherCurrentEphemerisArguments {
  illuminationEphemeris: IlluminationEphemeris;
  isoNow: string;
  planetCoordinateEphemeris: CoordinateEphemeris;
  sunCoordinateEphemeris: CoordinateEphemeris;
}

/** The planet's and sun's ecliptic coordinates at one timestamp. */
export interface GatheredPositions {
  latitudePlanet: number;
  latitudeSun: number;
  longitudePlanet: number;
  longitudeSun: number;
}

/** Arguments used to sample next/previous margin ephemeris arrays. */
export interface GatherMarginEphemerisArguments {
  direction: MarginDirection;
  illuminationEphemeris: IlluminationEphemeris;
  minute: Moment;
}

/** Arguments used to gather complete phase parameters for one planet. */
export interface GatherPhaseParametersArguments {
  illuminationEphemeris: IlluminationEphemeris;
  minute: Moment;
  planetCoordinateEphemeris: CoordinateEphemeris;
  sunCoordinateEphemeris: CoordinateEphemeris;
}

/** Arguments used to read planet and sun positions at one timestamp. */
export interface GatherPositionsArguments {
  planetCoordinateEphemeris: CoordinateEphemeris;
  sunCoordinateEphemeris: CoordinateEphemeris;
  timestamp: string;
}

/** Direction for sampling margin windows around a minute. */
export type MarginDirection = "next" | "previous";

/** Margin array sample of apparent magnitudes. */
export interface MarginEphemerisSample {
  magnitudes: number[];
}

/** Arguments used to compute per-minute Martian phase events. */
export interface MartianPhaseEventArguments {
  marsCoordinateEphemeris: CoordinateEphemeris;
  marsIlluminationEphemeris: IlluminationEphemeris;
  minute: Moment;
  sunCoordinateEphemeris: CoordinateEphemeris;
}

/** Arguments used to compute per-minute Mercurian phase events. */
export interface MercurianPhaseEventArguments {
  mercuryCoordinateEphemeris: CoordinateEphemeris;
  mercuryIlluminationEphemeris: IlluminationEphemeris;
  minute: Moment;
  sunCoordinateEphemeris: CoordinateEphemeris;
}

/**
 * Sliding-window scalar values consumed by phase checks (rise/set, elongation, brightness).
 */
export interface PhaseParameters {
  currentLatitudePlanet: number;
  currentLatitudeSun: number;
  currentLongitudePlanet: number;
  currentLongitudeSun: number;
  currentMagnitude: number;
  currentPhaseAngle: number;
  nextLatitudePlanet: number;
  nextLatitudeSun: number;
  nextLongitudePlanet: number;
  nextLongitudeSun: number;
  nextMagnitudes: number[];
  previousLatitudePlanet: number;
  previousLatitudeSun: number;
  previousLongitudePlanet: number;
  previousLongitudeSun: number;
  previousMagnitudes: number[];
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
  venusIlluminationEphemeris: IlluminationEphemeris;
}
