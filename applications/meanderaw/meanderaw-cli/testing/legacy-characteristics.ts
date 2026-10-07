/**
 * What the retired monolithic `CharacteristicsService` computed for a fixed
 * set of Codes, captured from it before it was deleted, so the evaluators
 * that replaced it stay pinned to the values it produced rather than to a
 * reading of themselves.
 *
 * The fixtures are the first, middle, and last enumerated Code of each
 * of the retired classifier's groups in the local database, the smallest
 * hardcoded Code of each group the enumeration never reaches, and three Codes whose repeating
 * unit is narrower than the Code as filed, so the unreduced tile-crossing
 * reading is exercised across every column rotation of a real tiling.
 *
 * Each entry holds one line per fixture, its values space-separated in
 * {@link LEGACY_FIELD_KEYS} order, so the whole capture stays readable at a
 * glance and a single changed value shows up as a single changed line.
 */

// ♟️ Constants

/**
 * The record fields the retired computation also produced, under their new
 * keys; `tileCrossing` is the retired `crossesTheSeam` flag, which the
 * record now states as `tileCrossingCount > 0`. The compound predicates it
 * also produced are left out: they were redefined as combinations of other
 * Characteristics, so they no longer match the retired values by design.
 */
export const LEGACY_FIELD_KEYS = [
  "bettiNumber0Count",
  "bettiNumber1Count",
  "cornerCount",
  "crossCount",
  "density",
  "dotCount",
  "doubleHorizontalEdgeCount",
  "doubleVerticalEdgeCount",
  "edgeCount",
  "embeddedUCount",
  "endsAreLatticeNeighbors",
  "endsOnBorderRules",
  "forkCount",
  "freeEndCount",
  "inkPointCount",
  "isClosedLoop",
  "isSingleArc",
  "longestHorizontalRunLength",
  "longestVerticalRunLength",
  "reversesAtItsTightestTurn",
  "tileCrossing",
  "tileCrossingComponentDeltaCount",
  "tileCrossingCycleCount",
] as const;

/** Every legacy field of each fixture Code, in {@link LEGACY_FIELD_KEYS} order. */
export const LEGACY_FIELDS: Readonly<Record<string, string>> = {
  "01x02y00":
    "2 0 0 0 0 2 0 0 0 0 false false 0 0 0 false false 0 0 false false 0 0",
  "01x02y03":
    "2 1 0 0 0.5 1 1 0 1 0 false false 0 0 1 false false 1 0 false true 0 1",
  "01x02y4b":
    "1 1 0 0 1 0 0 0 2 1 false false 1 1 2 false false 1 1 false true 0 1",
  "01x02y7b":
    "1 2 0 0 1 0 0 0 3 1 false false 2 0 2 false false 1 1 false true 0 2",
  "01x02y33":
    "2 2 0 0 1 0 2 0 2 0 false false 0 0 2 false false 1 0 false true 0 2",
  "01x02y48":
    "1 0 0 0 1 0 0 0 1 0 true true 0 2 2 false true 0 1 false false 0 0",
  "01x03y04b":
    "2 1 0 0 0.6666666666666666 1 0 0 2 1 false false 1 1 2 false false 1 1 false true 0 1",
  "01x06y0004f8":
    "4 1 0 1 0.5 3 0 0 3 2 false false 0 2 3 false false 1 2 false true 0 1",
  "01x08y07c87830":
    "5 3 0 0 0.75 2 1 1 6 2 false false 2 2 6 false false 1 2 false true 0 3",
  "01x08y07fb7fb3":
    "4 7 0 2 0.875 1 1 0 11 4 false false 4 0 7 false false 1 2 false true 0 7",
  "01x08y7fff87fb":
    "2 7 0 4 1 0 0 0 13 6 false false 3 1 8 false false 1 4 false true 0 7",
  "02x02y0000":
    "2 0 0 0 0 2 0 0 0 0 false false 0 0 0 false false 0 0 false false 0 0",
  "02x02y77bb":
    "1 2 0 0 1 0 0 0 3 1 false false 2 0 2 false false 1 1 false true 0 2",
  "02x02y1221":
    "2 0 0 0 1 0 0 0 2 0 false false 0 4 4 false false 1 0 false true 1 0",
  "02x02y3333":
    "2 2 0 0 1 0 2 0 2 0 false false 0 0 2 false false 1 0 false true 0 2",
  "02x02y4488":
    "1 0 0 0 1 0 0 0 1 0 true true 0 2 2 false true 0 1 false false 0 0",
  "02x03y44ad1a":
    "1 0 2 0 1 0 0 0 5 1 false false 1 3 6 false false 1 2 false true 1 0",
  "02x03y44ed88":
    "1 0 0 0 1 0 0 0 5 2 false false 2 4 6 false false 1 2 false false 0 0",
  "02x03y56cca9":
    "1 1 4 0 1 0 0 2 6 2 false false 0 0 6 true false 1 2 true true 0 1",
  "02x03y255aa1":
    "1 0 4 0 1 0 0 0 5 0 false true 0 2 6 false true 1 1 true true 1 0",
  "02x04y44a944a9":
    "2 0 4 0 1 0 0 0 6 2 false false 0 4 8 false false 1 1 true false 0 0",
  "02x04y255e8821":
    "2 0 2 0 1 0 0 0 6 1 false false 1 5 8 false false 1 2 false true 1 0",
  "03x02y6548a9":
    "1 0 4 0 1 0 0 0 5 2 false true 0 2 6 false true 1 1 true false 0 0",
  "03x03y752ca1a31":
    "1 0 3 0 1 0 1 1 8 1 false false 1 3 9 false false 2 2 false true 1 0",
  "03x03y777c8cb1a":
    "1 2 1 0 1 0 0 2 10 4 true false 4 2 9 false false 3 2 false true 0 2",
  "03x03y2752d81a3":
    "1 0 2 0 1 0 1 0 8 2 false false 2 4 9 false false 2 2 false true 1 0",
  "03x03y2754c89a3":
    "1 0 3 0 1 0 1 1 8 1 false false 1 3 9 false false 2 2 false true 1 0",
  "03x03y4658cc3bb":
    "2 2 2 0 1 0 1 2 9 2 true false 2 2 9 false false 3 2 false true 0 1",
  "03x03y7528e12b1":
    "1 0 1 0 1 0 0 0 8 2 false false 3 5 9 false false 2 2 false true 1 0",
  "03x03y23535a1a3":
    "1 0 4 0 1 0 3 0 8 0 false true 0 2 9 false true 2 1 true true 2 0",
  "04x02y444488a9":
    "3 0 2 0 1 0 0 0 5 1 false false 0 6 8 false false 1 1 true false 0 0",
  "04x03y6354c48c8a39":
    "2 0 4 0 1 0 2 2 10 0 false false 0 4 12 false false 2 2 true false 0 0",
  "04x03y6354c69c8a39":
    "1 0 6 0 1 0 2 2 11 2 false true 0 2 12 false true 2 2 true false 0 0",
  "04x03y37375a5ab3b3":
    "1 2 2 0 1 0 2 0 7 2 false false 2 0 6 false false 2 1 false true 1 2",
  "04x03y356369a5a339":
    "1 1 8 0 1 0 4 0 12 4 false false 0 0 12 true false 3 1 true true 0 1",
  "04x03y35634884a339":
    "2 0 4 0 1 0 4 0 10 0 false false 0 4 12 false false 3 1 true true 1 0",
  "04x04y4040b7b75a5ab3b3":
    "2 2 2 0 0.875 1 1 0 8 2 false false 3 1 7 false false 2 1 false true 1 2",
  "04x04y5252f3f396963b3b":
    "1 2 3 1 1 0 2 0 9 3 false false 1 1 8 false false 2 2 false true 2 2",
  "04x04y2335635cc29ca339":
    "1 0 6 0 1 0 5 3 15 1 false false 0 2 16 false true 3 3 true false 0 0",
  "05x02y67565a9ab9":
    "1 2 8 0 1 0 0 0 11 4 false false 2 0 10 false false 2 1 false false 0 0",
  "05x02y67710abb31":
    "2 2 2 0 0.9 1 1 0 10 3 false true 4 2 9 false false 4 1 false false 0 0",
  "05x02y6754488ab9":
    "1 0 4 0 1 0 0 0 9 4 false false 2 4 10 false false 2 1 false false 0 0",
  "05x02y233353331a":
    "1 0 2 0 1 0 6 0 9 0 false true 0 2 10 false true 4 1 false true 1 0",
  "05x02y4444488888":
    "1 0 0 0 1 0 0 0 1 0 true true 0 2 2 false true 0 1 false false 0 0",
  "05x03y65635c8c4ca39a9":
    "1 0 8 0 1 0 2 3 14 2 false false 0 2 15 false true 2 2 true false 0 0",
  "06x02y2525251a1a1a":
    "1 0 2 0 1 0 0 0 3 0 true true 0 2 4 false true 1 1 true true 1 0",
};

/**
 * Each fixture Code drawn 1, 2, and 3 times side by side, one run per
 * tiling separated by ` | `: the retired `seamComponents` score of the tiling
 * cut at every column rotation in turn, starting from rotation 0.
 */
export const LEGACY_TILE_CROSSING_COMPONENT_DELTAS: Readonly<
  Record<string, string>
> = {
  "01x02y00": "0 | 0 0 | 0 0 0",
  "01x02y03": "0 | 0 0 | 0 0 0",
  "01x02y4b": "0 | 0 0 | 0 0 0",
  "01x02y7b": "0 | 0 0 | 0 0 0",
  "01x02y33": "0 | 0 0 | 0 0 0",
  "01x02y48": "0 | 0 0 | 0 0 0",
  "01x03y04b": "0 | 0 0 | 0 0 0",
  "01x06y0004f8": "0 | 0 0 | 0 0 0",
  "01x08y07c87830": "0 | 0 0 | 0 0 0",
  "01x08y07fb7fb3": "0 | 0 0 | 0 0 0",
  "01x08y7fff87fb": "0 | 0 0 | 0 0 0",
  "02x02y0000": "0 0 | 0 0 0 0 | 0 0 0 0 0 0",
  "02x02y77bb": "0 0 | 0 0 0 0 | 0 0 0 0 0 0",
  "02x02y1221": "1 1 | 1 1 1 1 | 1 1 1 1 1 1",
  "02x02y3333": "0 0 | 0 0 0 0 | 0 0 0 0 0 0",
  "02x02y4488": "0 0 | 0 0 0 0 | 0 0 0 0 0 0",
  "02x03y44ad1a": "1 1 | 1 1 1 1 | 1 1 1 1 1 1",
  "02x03y44ed88": "0 1 | 0 1 0 1 | 0 1 0 1 0 1",
  "02x03y56cca9": "0 0 | 0 0 0 0 | 0 0 0 0 0 0",
  "02x03y255aa1": "1 2 | 1 2 1 2 | 1 2 1 2 1 2",
  "02x04y44a944a9": "0 2 | 0 2 0 2 | 0 2 0 2 0 2",
  "02x04y255e8821": "1 2 | 1 2 1 2 | 1 2 1 2 1 2",
  "03x02y6548a9": "0 1 1 | 0 1 1 0 1 1 | 0 1 1 0 1 1 0 1 1",
  "03x03y752ca1a31": "1 2 2 | 1 2 2 1 2 2 | 1 2 2 1 2 2 1 2 2",
  "03x03y777c8cb1a": "0 1 0 | 0 1 0 0 1 0 | 0 1 0 0 1 0 0 1 0",
  "03x03y2752d81a3": "1 2 2 | 1 2 2 1 2 2 | 1 2 2 1 2 2 1 2 2",
  "03x03y2754c89a3": "1 1 2 | 1 1 2 1 1 2 | 1 1 2 1 1 2 1 1 2",
  "03x03y4658cc3bb": "0 0 0 | 0 0 0 0 0 0 | 0 0 0 0 0 0 0 0 0",
  "03x03y7528e12b1": "1 2 2 | 1 2 2 1 2 2 | 1 2 2 1 2 2 1 2 2",
  "03x03y23535a1a3": "2 2 2 | 2 2 2 2 2 2 | 2 2 2 2 2 2 2 2 2",
  "04x02y444488a9": "0 0 0 1 | 0 0 0 1 0 0 0 1 | 0 0 0 1 0 0 0 1 0 0 0 1",
  "04x03y6354c48c8a39": "0 1 2 1 | 0 1 2 1 0 1 2 1 | 0 1 2 1 0 1 2 1 0 1 2 1",
  "04x03y6354c69c8a39": "0 1 3 1 | 0 1 3 1 0 1 3 1 | 0 1 3 1 0 1 3 1 0 1 3 1",
  "04x03y37375a5ab3b3": "0 0 0 0 | 0 0 0 0 0 0 0 0 | 0 0 0 0 0 0 0 0 0 0 0 0",
  "04x03y356369a5a339": "0 2 0 2 | 0 2 0 2 0 2 0 2 | 0 2 0 2 0 2 0 2 0 2 0 2",
  "04x03y35634884a339": "1 2 1 2 | 1 2 1 2 1 2 1 2 | 1 2 1 2 1 2 1 2 1 2 1 2",
  "04x04y4040b7b75a5ab3b3":
    "0 0 0 0 | 0 0 0 0 0 0 0 0 | 0 0 0 0 0 0 0 0 0 0 0 0",
  "04x04y5252f3f396963b3b":
    "1 0 1 0 | 1 0 1 0 1 0 1 0 | 1 0 1 0 1 0 1 0 1 0 1 0",
  "04x04y2335635cc29ca339":
    "0 3 4 2 | 0 3 4 2 0 3 4 2 | 0 3 4 2 0 3 4 2 0 3 4 2",
  "05x02y67565a9ab9":
    "0 1 1 1 1 | 0 1 1 1 1 0 1 1 1 1 | 0 1 1 1 1 0 1 1 1 1 0 1 1 1 1",
  "05x02y67710abb31":
    "0 1 1 2 1 | 0 1 1 2 1 0 1 1 2 1 | 0 1 1 2 1 0 1 1 2 1 0 1 1 2 1",
  "05x02y6754488ab9":
    "0 1 1 1 1 | 0 1 1 1 1 0 1 1 1 1 | 0 1 1 1 1 0 1 1 1 1 0 1 1 1 1",
  "05x02y233353331a":
    "1 2 2 2 1 | 1 2 2 2 1 1 2 2 2 1 | 1 2 2 2 1 1 2 2 2 1 1 2 2 2 1",
  "05x02y4444488888":
    "0 0 0 0 0 | 0 0 0 0 0 0 0 0 0 0 | 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
  "05x03y65635c8c4ca39a9":
    "0 2 1 1 2 | 0 2 1 1 2 0 2 1 1 2 | 0 2 1 1 2 0 2 1 1 2 0 2 1 1 2",
  "06x02y2525251a1a1a":
    "1 1 1 1 1 1 | 1 1 1 1 1 1 1 1 1 1 1 1 | 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1",
};

/** Each fixture Code drawn 1, 2, and 3 times side by side: whether the retired computation called the tiling reducible. */
export const LEGACY_REDUCIBILITY: Readonly<Record<string, string>> = {
  "01x02y00": "false true true",
  "01x02y03": "false true true",
  "01x02y4b": "false true true",
  "01x02y7b": "false true true",
  "01x02y33": "false true true",
  "01x02y48": "false true true",
  "01x03y04b": "false true true",
  "01x06y0004f8": "false true true",
  "01x08y07c87830": "false true true",
  "01x08y07fb7fb3": "false true true",
  "01x08y7fff87fb": "false true true",
  "02x02y0000": "true true true",
  "02x02y77bb": "true true true",
  "02x02y1221": "false true true",
  "02x02y3333": "true true true",
  "02x02y4488": "true true true",
  "02x03y44ad1a": "false true true",
  "02x03y44ed88": "false true true",
  "02x03y56cca9": "false true true",
  "02x03y255aa1": "false true true",
  "02x04y44a944a9": "false true true",
  "02x04y255e8821": "false true true",
  "03x02y6548a9": "false true true",
  "03x03y752ca1a31": "false true true",
  "03x03y777c8cb1a": "false true true",
  "03x03y2752d81a3": "false true true",
  "03x03y2754c89a3": "false true true",
  "03x03y4658cc3bb": "false true true",
  "03x03y7528e12b1": "false true true",
  "03x03y23535a1a3": "false true true",
  "04x02y444488a9": "false true true",
  "04x03y6354c48c8a39": "false true true",
  "04x03y6354c69c8a39": "false true true",
  "04x03y37375a5ab3b3": "true true true",
  "04x03y356369a5a339": "false true true",
  "04x03y35634884a339": "false true true",
  "04x04y4040b7b75a5ab3b3": "true true true",
  "04x04y5252f3f396963b3b": "true true true",
  "04x04y2335635cc29ca339": "false true true",
  "05x02y67565a9ab9": "false true true",
  "05x02y67710abb31": "false true true",
  "05x02y6754488ab9": "false true true",
  "05x02y233353331a": "false true true",
  "05x02y4444488888": "true true true",
  "05x03y65635c8c4ca39a9": "false true true",
  "06x02y2525251a1a1a": "true true true",
};
