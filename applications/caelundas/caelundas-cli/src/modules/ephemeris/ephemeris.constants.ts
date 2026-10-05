// ♟️ Constants
import { constants, set_ephe_path } from "sweph";

import type { Asteroid, Node, Planet } from "../caelundas/caelundas.types";

/** Swiss Ephemeris flag for converting ecliptic coordinates to horizontal (azimuth/elevation). */
export const ECLIPTIC_TO_HORIZONTAL_FLAG: number = constants.SE_ECL2HOR;
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
