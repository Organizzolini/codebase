// ♟️ Constants

import type { LunarPhase } from "../caelundas/caelundas.types";

/**
 * The Moon's apparent geocentric ecliptic longitude minus the Sun's, in
 * degrees, at the instant each primary phase begins. This is the definition
 * USNO and the almanacs publish phase times by.
 */
export const ELONGATION_BY_PRIMARY_LUNAR_PHASE = {
  "first quarter": 90,
  full: 180,
  "last quarter": 270,
  new: 0,
} as const satisfies Partial<Record<LunarPhase, number>>;
