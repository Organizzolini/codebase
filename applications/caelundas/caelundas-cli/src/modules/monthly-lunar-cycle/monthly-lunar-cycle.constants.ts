// ♟️ Constants

import type { LunarPhase } from "../caelundas/caelundas.types";

export const LUNAR_APOGEE_CATEGORY = "Apogee";
export const LUNAR_PERIGEE_CATEGORY = "Perigee";

/** Apsis events keep clear of "Monthly Lunar Cycle", whose phase events are paired into spans. */
export const LUNAR_APSIDES_BASE_CATEGORIES = [
  "Astronomy",
  "Astrology",
  "Lunar Apsides",
  "Lunar",
] as const;

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
