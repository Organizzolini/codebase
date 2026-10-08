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

/**
 * Reference frame for eclipse visibility reporting.
 * - `geocentric`: Eclipse as seen from Earth's centre (always occurs when geometry aligns)
 * - `topocentric`: Eclipse as seen from the observer's ground location (requires bodies above horizon).
 */
export type EclipseFrame = "geocentric" | "topocentric";
