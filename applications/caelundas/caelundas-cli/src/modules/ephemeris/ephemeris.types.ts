import type { Body } from "../caelundas/caelundas.types";

// 🏷️ Types

/**
 * Time-indexed ephemeris of horizontal coordinates (observer frame).
 *
 * Keys are ISO timestamps, values are {@link HorizonPosition}s. Positions are
 * topocentric: parallax is applied for the observer's location.
 * Used for calculating rise, set, and culmination events.
 *
 * @see {@link getAzimuthElevationFromEphemeris} for data retrieval
 */
export type AzimuthElevationEphemeris = Record<string, HorizonPosition>;

/**
 * Bodies for which azimuth/elevation ephemerides are generated.
 * Limited to Sun and Moon for rise/set calculations.
 *
 * @remarks A copy of this type exists in `caelundas.constants.ts` to avoid a circular
 * import. Update both when the body set changes.
 */
export type AzimuthElevationEphemerisBody = Extract<Body, "moon" | "sun">;

/**
 * Time-indexed ephemeris of ecliptic coordinates for a celestial body.
 *
 * Keys are ISO 8601 timestamp strings, values contain longitude and latitude
 * in degrees. Used for tracking body positions through the zodiac.
 *
 * @see {@link getCoordinateFromEphemeris} for data retrieval
 */
export type CoordinateEphemeris = Record<
  string,
  { latitude: number; longitude: number }
>;

/**
 * Bodies for which coordinate ephemerides are generated.
 * Includes all tracked planets, asteroids, comets, and lunar nodes.
 */
export type CoordinateEphemerisBody = Body;

/**
 * Coordinate pair representing a position on the celestial sphere.
 * Format: [longitude, latitude] in degrees.
 */
export type Coordinates = [Longitude, Latitude];

/**
 * Time-indexed ephemeris of observer-body distance and its rate of change.
 *
 * Keys are ISO timestamps. `distance` is in astronomical units (AU) and
 * `distanceSpeed` is the radial speed in AU per day, positive while the body
 * recedes. Apsis detection (perihelion/aphelion, perigee/apogee) reads the
 * sign of `distanceSpeed`, not the distance itself: the distance series has
 * small steps where the Swiss Ephemeris files change polynomial segment, while
 * the speed stays smooth through them and crosses zero once per apsis.
 */
export type DistanceEphemeris = Record<
  string,
  { distance: number; distanceSpeed: number }
>;

/**
 * Bodies for which distance ephemerides are generated.
 * Includes Sun (for apsis), Moon (for eclipse parallax and semidiameter) and
 * inner planets with visible orbital variations.
 *
 * @remarks A copy of this type exists in `caelundas.constants.ts` to avoid a circular
 * import. Update both when the body set changes.
 */
export type DistanceEphemerisBody = Extract<
  Body,
  "mars" | "mercury" | "moon" | "sun" | "venus"
>;

/**
 * Aggregated ephemeris data for all tracked bodies.
 */
export interface Ephemerides {
  azimuthElevationEphemerisByBody: Record<Body, AzimuthElevationEphemeris>;
  coordinateEphemerisByBody: Record<Body, CoordinateEphemeris>;
  distanceEphemerisByBody: Record<Body, DistanceEphemeris>;
  illuminationEphemerisByBody: Record<Body, IlluminationEphemeris>;
}

/**
 * Where a body sits in one observer's sky at one minute, from its topocentric position.
 */
export interface HorizonPosition {
  /** Degrees from North, clockwise through East (0° North, 90° East, 180° South, 270° West). */
  azimuth: number;
  /** Topocentric apparent ecliptic latitude of date, degrees. */
  eclipticLatitude: number;
  /** Topocentric apparent ecliptic longitude of date, degrees. */
  eclipticLongitude: number;
  /** Apparent (refracted) elevation of the center, degrees; refraction is dropped below the horizon. */
  elevation: number;
  /** Topocentric angular radius, degrees: half the disc the observer sees. */
  semidiameter: number;
  /** True (airless, unrefracted) elevation of the center, degrees. */
  trueElevation: number;
}

/**
 * Time-indexed ephemeris of illumination fraction.
 *
 * Keys are ISO timestamps, values are illumination percentages (0-100).
 * Used for lunar phase and planetary phase calculations.
 */
export type IlluminationEphemeris = Record<string, { illumination: number }>;

/**
 * Bodies for which illumination ephemerides are generated.
 * Includes bodies with visible phases: Sun (always 100%), Moon, and inner planets.
 *
 * @remarks A copy of this type exists in `caelundas.constants.ts` to avoid a circular
 * import. Update both when the body set changes.
 */
export type IlluminationEphemerisBody = Extract<
  Body,
  "mars" | "mercury" | "moon" | "sun" | "venus"
>;

/**
 * Ecliptic latitude in degrees.
 * Range: -90° (south) to +90° (north) from the ecliptic plane.
 */
export type Latitude = number;

/**
 * Ecliptic longitude in degrees.
 * Range: 0° to 360° along the ecliptic, starting from the vernal equinox.
 */
export type Longitude = number;
