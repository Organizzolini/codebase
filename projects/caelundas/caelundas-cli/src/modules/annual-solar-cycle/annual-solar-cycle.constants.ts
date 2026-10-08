// ♟️ Constants

export const ANNUAL_SOLAR_CYCLE_BASE_CATEGORIES = [
  "Astronomy",
  "Astrology",
  "Annual Solar Cycle",
  "Solar",
] as const;

export const APHELION_CATEGORY = "Aphelion";
export const PERIHELION_CATEGORY = "Perihelion";

export const SOLAR_ADVANCING_CATEGORY = "Advancing";
export const SOLAR_RETREATING_CATEGORY = "Retreating";

export const SOLAR_ADVANCING_DESCRIPTION =
  "Solar Advancing (Aphelion to Perihelion)";
export const SOLAR_RETREATING_DESCRIPTION =
  "Solar Retreating (Perihelion to Aphelion)";

export const SOLAR_ADVANCING_SUMMARY = "☀️ 🔥 Solar Advancing";
export const SOLAR_RETREATING_SUMMARY = "☀️ ❄️ Solar Retreating";

export const SOLAR_CYCLE_EVENT_TIMEZONE = "America/New_York";

export const SOLAR_CYCLE_LONGITUDE_THRESHOLDS = {
  autumnalEquinox: 180,
  beltane: 45,
  eleventhHexadecan: 247.5,
  fifteenthHexadecan: 337.5,
  fifthHexadecan: 112.5,
  firstHexadecan: 22.5,
  imbolc: 315,
  lammas: 135,
  ninthHexadecan: 202.5,
  samhain: 225,
  seventhHexadecan: 157.5,
  summerSolstice: 90,
  thirdHexadecan: 67.5,
  thirteenthHexadecan: 292.5,
  winterSolstice: 270,
} as const;
