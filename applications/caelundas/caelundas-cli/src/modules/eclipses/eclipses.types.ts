/**
 * How far one eclipse has to go at one minute, seen from Earth's center.
 *
 * The eclipse is in progress while `separation` is below `contactLimit`;
 * the two are equal at the first and last external contacts.
 */
export interface EclipseContactGeometry {
  /** Separation at external contact, degrees: P1/P4 for both kinds of eclipse. */
  contactLimit: number;
  /**
   * Angular separation, degrees: Moon from the shadow axis (the antisolar
   * point) for a lunar eclipse, Moon from Sun for a solar one.
   */
  separation: number;
}

/** Previous, current and next minute of one eclipse's contact geometry. */
export interface EclipseContactWindow {
  current: EclipseContactGeometry;
  next: EclipseContactGeometry;
  previous: EclipseContactGeometry;
}

// 🏷️ Types
/**
 * Per-minute geocentric Sun/Moon geometry used by eclipse phase and visibility predicates.
 * Longitudes and latitudes are apparent ecliptic of date, in degrees; distances are in AU.
 */
export interface EclipseCoordinates {
  distanceMoon: number;
  distanceSun: number;
  latitudeMoon: number;
  latitudeSun: number;
  longitudeMoon: number;
  longitudeSun: number;
}

/** Previous, current and next minute of geocentric eclipse coordinates. */
export interface EclipseCoordinatesWindow {
  current: EclipseCoordinates;
  next: EclipseCoordinates;
  previous: EclipseCoordinates;
}

/**
 * Reference frame for eclipse visibility reporting.
 * - `geocentric`: Eclipse as seen from Earth's centre (always occurs when geometry aligns)
 * - `topocentric`: Eclipse as seen from the observer's ground location (requires bodies above horizon).
 */
export type EclipseFrame = "geocentric" | "topocentric";

/**
 * The type given to the eclipse in progress, and the last minute (epoch
 * milliseconds) it was seen, so later minutes of it reuse that type.
 */
export interface EclipseOccurrence<TType extends EclipseType> {
  minute: number;
  type: TType;
}

/**
 * Kind of eclipse by the deepest shadow it reaches, as NASA's catalog names it.
 * - lunar: `total` (inside the umbra), `partial` (partly), `penumbral` (only the penumbra)
 * - solar: `total`, `annular`, `hybrid` (total at greatest, annular at the path's ends), `partial` (the umbra misses Earth)
 */
export type EclipseType = LunarEclipseType | SolarEclipseType;

/** How deep a lunar eclipse goes: see {@link EclipseType}. */
export type LunarEclipseType = "partial" | "penumbral" | "total";

/** How deep a solar eclipse goes: see {@link EclipseType}. */
export type SolarEclipseType = "annular" | "hybrid" | "partial" | "total";

/**
 * The Sun or the Moon as the observer sees it at one minute: topocentric
 * apparent ecliptic position of date and semidiameter, in degrees.
 */
export interface TopocentricDisc {
  /**
   * How far the upper limb stands above the horizon, degrees, as rise and
   * set judge it: true elevation plus 34′ of refraction plus semidiameter.
   * Positive while the body is up.
   */
  clearance: number;
  latitude: number;
  longitude: number;
  semidiameter: number;
}

/** The Sun and the Moon as the observer sees them at one minute. */
export interface TopocentricSample {
  moon: TopocentricDisc;
  sun: TopocentricDisc;
}

/** Previous, current and next minute of the observer's Sun and Moon. */
export interface TopocentricWindow {
  current: TopocentricSample;
  next: TopocentricSample;
  previous: TopocentricSample;
}
