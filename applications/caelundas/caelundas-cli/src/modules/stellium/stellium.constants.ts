// ♟️ Constants

import type { symbolByStellium } from "../caelundas/symbol-caelundas.constants";

/** The `symbolByStellium` key for each stellium size it has a symbol for. */
export const stelliumNameBySize: Readonly<
  Record<number, keyof typeof symbolByStellium>
> = {
  3: "triple stellium",
  4: "quadruple stellium",
  5: "quintuple stellium",
  6: "sextuple stellium",
  7: "septuple stellium",
  8: "octuple stellium",
  9: "nonuple stellium",
  10: "decuple stellium",
  11: "undecuple stellium",
  12: "duodecuple stellium",
};
