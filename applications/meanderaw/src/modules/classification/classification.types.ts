// 🏷️ Types

import type { Characteristics } from "../characteristics/characteristics.types";

/**
 * Every family a meander can be classified into, or unclassified if none matches.
 */
export type MeanderFamily =
  | "arcade"
  | "bars"
  | "boxes"
  | "chain"
  | "clasps"
  | "comb"
  | "cross"
  | "dots"
  | "double-chain"
  | "fork"
  | "lines"
  | "mesh"
  | "parallel"
  | "snake"
  | "stipple"
  | "swirl"
  | "tree"
  | "unclassified"
  | "waterfalls"
  | "whirl";

/**
 * One family's defining combination, as a predicate over a tile's
 * structure rather than over the parameters that drew it.
 */
export interface MeanderFamilyRule {
  readonly matches: (structure: MeanderStructure) => boolean;
  readonly name: MeanderFamily;
}

/**
 * How deep one repeat is as filed, and whether it reduces to a narrower
 * repeating unit — facts about the filed Code rather than about the unit
 * its {@link Characteristics} are measured on. `classify` needs no column
 * count: every rule reads only `rows` and `isReducible`.
 */
export interface MeanderFiledShape {
  readonly isReducible: boolean;
  readonly rows: number;
}

/**
 * Everything a family rule reads: the tile's measured Characteristics record and its shape.
 */
export interface MeanderStructure extends MeanderFiledShape {
  readonly characteristics: Characteristics;
}
