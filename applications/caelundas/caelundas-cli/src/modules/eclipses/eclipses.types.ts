// 🏷️ Types
/**
 * Per-minute Sun/Moon geometry used by eclipse phase and visibility predicates.
 */
export interface EclipseCoordinates {
  diameterMoon: number;
  diameterSun: number;
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
