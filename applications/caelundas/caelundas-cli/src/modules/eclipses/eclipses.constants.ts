// ♟️ Constants
import type { EclipseType } from "./eclipses.types";

/**
 * Danjon's enlargement of Earth's shadow: the Moon's parallax is scaled by
 * 1.01, growing Earth's radius by about 1/85 for its atmosphere. NASA's
 * lunar eclipse tables (F. Espenak) time their contacts with this rule.
 */
export const DANJON_SHADOW_ENLARGEMENT = 1.01;

/** Earth's equatorial radius in kilometers (WGS 84), the unit of gamma. */
export const EARTH_EQUATORIAL_RADIUS_KILOMETERS = 6378.137;

/** Degrees per radian. */
export const DEGREES_PER_RADIAN = 180 / Math.PI;

/** Title-case name of each eclipse type, as it appears in summaries and categories. */
export const eclipseTypeLabelByType: Record<EclipseType, string> = {
  annular: "Annular",
  hybrid: "Hybrid",
  partial: "Partial",
  penumbral: "Penumbral",
  total: "Total",
};

/** Milliseconds between two consecutive minutes of a sweep. */
export const MILLISECONDS_PER_MINUTE = 60_000;

/**
 * The longest a solar eclipse can last at one place, in minutes, with room
 * to spare: about three and a half hours from first to last contact.
 */
export const LOCAL_SOLAR_ECLIPSE_MAXIMUM_MINUTES = 300;
