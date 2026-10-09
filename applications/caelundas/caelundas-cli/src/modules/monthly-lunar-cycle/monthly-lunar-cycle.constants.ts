// ♟️ Constants

import type { LunarPhase } from "../caelundas/caelundas.types";

/**
 * The Moon's apparent geocentric ecliptic longitude minus the Sun's, in
 * degrees, at the instant each phase begins. The four primary phases are the
 * definition USNO and the almanacs publish phase times by; the crescent and
 * gibbous phases begin at the octants halfway between them.
 */
export const ELONGATION_BY_LUNAR_PHASE: Record<LunarPhase, number> = {
  "first quarter": 90,
  full: 180,
  "last quarter": 270,
  new: 0,
  "waning crescent": 315,
  "waning gibbous": 225,
  "waxing crescent": 45,
  "waxing gibbous": 135,
};
