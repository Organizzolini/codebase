// ♟️ Constants

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
