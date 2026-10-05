// ♟️ Constants

import type { MeanderFamily } from "./classification.types";

/**
 * Supported meander families with precedence:
 * dots -> lines -> bars -> mesh -> comb -> arcade -> parallel -> cross -> fork -> tree -> boxes -> chain -> double-chain -> waterfalls -> whirl -> swirl -> clasps -> snake -> stipple -> unclassified.
 */
export const MEANDER_FAMILIES: readonly MeanderFamily[] = [
  "dots",
  "lines",
  "bars",
  "mesh",
  "parallel",
  "cross",
  "arcade",
  "comb",
  "fork",
  "tree",
  "boxes",
  "chain",
  "double-chain",
  "waterfalls",
  "whirl",
  "swirl",
  "clasps",
  "snake",
  "stipple",
  "unclassified",
];

/**
 * The shallowest band each family's structure can exist in.
 */
export const STRUCTURAL_MINIMUM_ROWS: Record<MeanderFamily, number> = {
  arcade: 2,
  bars: 2,
  boxes: 4,
  chain: 3,
  clasps: 3,
  comb: 2,
  cross: 6,
  dots: 1,
  "double-chain": 3,
  fork: 3,
  lines: 1,
  mesh: 2,
  parallel: 2,
  snake: 3,
  stipple: 2,
  swirl: 3,
  tree: 3,
  unclassified: 1,
  waterfalls: 2,
  whirl: 3,
};
