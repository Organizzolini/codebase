// ♟️ Constants

/**
 * The sixteen orientation names every letter is keyed by, in the order
 * `LetterUtilitiesService.orientations` enumerates them: each corner —
 * Southeast, Southwest, Northeast, Northwest — unturned, then turned a
 * quarter, a half, and three quarters clockwise.
 */
export const LETTER_ORIENTATION_NAMES = [
  "Southeast",
  "SoutheastQuarter",
  "SoutheastHalf",
  "SoutheastThreeQuarter",
  "Southwest",
  "SouthwestQuarter",
  "SouthwestHalf",
  "SouthwestThreeQuarter",
  "Northeast",
  "NortheastQuarter",
  "NortheastHalf",
  "NortheastThreeQuarter",
  "Northwest",
  "NorthwestQuarter",
  "NorthwestHalf",
  "NorthwestThreeQuarter",
] as const;

/**
 * Every script whose letters are drawn as glyph templates, with its base
 * corner: its reading direction, the corner its glyphs face before any flip.
 * The source of truth for `LetterScript`, so a new script is one entry here.
 */
export const LETTER_SCRIPTS = {
  Arabic: { baseCorner: "Southwest" },
  Greek: { baseCorner: "Southeast" },
  Hangul: { baseCorner: "Southeast" },
  Hanzi: { baseCorner: "Southeast" },
  Hebrew: { baseCorner: "Southwest" },
  Katakana: { baseCorner: "Southeast" },
  Latin: { baseCorner: "Southeast" },
} as const;
