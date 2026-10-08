// ♟️ Constants

export const LUNAR_APOGEE_CATEGORY = "Apogee";
export const LUNAR_PERIGEE_CATEGORY = "Perigee";

/** Apsis events keep clear of "Monthly Lunar Cycle", whose phase events are paired into spans. */
export const LUNAR_APSIDES_BASE_CATEGORIES = [
  "Astronomy",
  "Astrology",
  "Lunar Apsides",
  "Lunar",
] as const;
