// ♟️ Constants
import { constants, set_ephe_path } from "sweph";

import type { Asteroid, Node, Planet } from "../caelundas/caelundas.types";
import type { AzimuthElevationEphemerisBody } from "./ephemeris.types";

/** Kilometers in one astronomical unit (IAU 2012). */
export const KILOMETERS_PER_ASTRONOMICAL_UNIT = 149_597_870.7;
/**
 * Mean radius of each horizon body in kilometers: the Sun's IAU 2015 nominal
 * radius and the Moon's IAU mean radius. With the topocentric distance they
 * give the semidiameter that rise and set thresholds use.
 */
export const radiusKilometersByHorizonBody: Record<
  AzimuthElevationEphemerisBody,
  number
> = { moon: 1737.4, sun: 695_700 };
/**
 * Standard atmospheric refraction at the horizon, 34′ in degrees, as the US
 * Naval Observatory uses it. Rise and set, and eclipse visibility, all judge
 * the horizon by it: a body is up while its true elevation plus this plus its
 * semidiameter is above zero.
 */
export const HORIZON_REFRACTION_DEGREES = 34 / 60;
/** Swiss Ephemeris flag for converting ecliptic coordinates to horizontal (azimuth/elevation). */
export const ECLIPTIC_TO_HORIZONTAL_FLAG: number = constants.SE_ECL2HOR;
/**
 * Observer height above sea level, in meters, for topocentric positions.
 * Sea level matches the US Naval Observatory, which ignores site elevation.
 */
export const OBSERVER_ELEVATION_METERS = 0;
/** Swiss Ephemeris flag selecting the proleptic Gregorian calendar for Julian Day conversions. */
export const GREGORIAN_CALENDAR_FLAG: number = constants.SE_GREG_CAL;
/** Swiss Ephemeris flag requesting osculating (instantaneous) orbital elements for the Moon. */
export const OSCULATING_ORBITAL_ELEMENTS_FLAG: number =
  constants.SE_NODBIT_OSCU;
/**
 * Combined Swiss Ephemeris computation flags applied to every body calculation.
 * `SEFLG_SWIEPH` uses the built-in Swiss Ephemeris data files; `SEFLG_SPEED`
 * requests daily velocity alongside position, enabling retrograde detection.
 */
export const SWISS_EPHEMERIS_FLAGS: number =
  constants.SEFLG_SWIEPH | constants.SEFLG_SPEED;
/**
 * {@link SWISS_EPHEMERIS_FLAGS} plus `SEFLG_TOPOCTR`: the position seen from
 * the observer that `set_topo` placed, parallax included, not from Earth's center.
 */
export const TOPOCENTRIC_EPHEMERIS_FLAGS: number =
  SWISS_EPHEMERIS_FLAGS | constants.SEFLG_TOPOCTR;

/** Maps each planet name to its Swiss Ephemeris integer body identifier. */
export const swissEphemerisConstantByPlanet: Record<Planet, number> = {
  jupiter: constants.SE_JUPITER,
  mars: constants.SE_MARS,
  mercury: constants.SE_MERCURY,
  moon: constants.SE_MOON,
  neptune: constants.SE_NEPTUNE,
  pluto: constants.SE_PLUTO,
  saturn: constants.SE_SATURN,
  sun: constants.SE_SUN,
  uranus: constants.SE_URANUS,
  venus: constants.SE_VENUS,
};

/** Maps each asteroid name to its Swiss Ephemeris integer body identifier. */
export const swissEphemerisConstantByAsteroid: Record<Asteroid, number> = {
  ceres: constants.SE_CERES,
  chiron: constants.SE_CHIRON,
  juno: constants.SE_JUNO,
  lilith: constants.SE_MEAN_APOG,
  pallas: constants.SE_PALLAS,
  vesta: constants.SE_VESTA,
};

/**
 * Maps each lunar node / apside name to its Swiss Ephemeris integer body identifier.
 * Lunar perigee has no direct SE constant and is derived from osculating elements, so its value is `null`.
 */
export const swissEphemerisConstantByNode: Record<Node, null | number> = {
  "lunar apogee": constants.SE_OSCU_APOG,
  "lunar perigee": null,
  "north lunar node": constants.SE_TRUE_NODE,
  "south lunar node": constants.SE_TRUE_NODE,
};

/**
 * Configures the Swiss Ephemeris data path before any calculations are performed.
 *
 * Must be called once at application startup. The `./data/ephemeris` directory
 * contains the `.se1` binary data files bundled with the caelundas Docker image.
 */
export function initializeSwissEphemeris(): void {
  set_ephe_path("./data/ephemeris");
}
