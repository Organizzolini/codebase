import { LETTER_ORIENTATION_NAMES } from "./submatrix/letter/letter.constants";

// ♟️ Constants

/**
 * The key of every letter glyph count, sixteen per letter: the letter's
 * transliteration, its positional form for an Arabic letter, one of its
 * sixteen orientation names, and its script —
 * `<letter>[<Form>]<Corner>[Quarter|Half|ThreeQuarter]<Script>Count`, such as
 * `aSoutheastLatinCount`, `daletSouthwestHalfHebrewCount`, or
 * `behIsolatedSouthwestArabicCount`. Letters run alphabetically, and each
 * letter's keys in `LETTER_ORIENTATION_NAMES` order.
 * Each is the `metadata.key` of one evaluator a letter service provides.
 */
export const LETTER_CHARACTERISTIC_KEYS = [
  ...LETTER_ORIENTATION_NAMES.map((name) => `a${name}LatinCount` as const),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `ainFinal${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `ainInitial${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `ainIsolated${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `ainMedial${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `alefFinal${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map((name) => `ao${name}HanziCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `b${name}LatinCount` as const),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `behFinal${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `behInitial${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `behIsolated${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `behMedial${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map((name) => `c${name}LatinCount` as const),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `dalFinal${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `dalIsolated${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map((name) => `dalet${name}HebrewCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `delta${name}GreekCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `e${name}LatinCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `f${name}LatinCount` as const),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `fehFinal${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `fehInitial${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `fehIsolated${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `fehMedial${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map((name) => `gan${name}HanziCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `h${name}LatinCount` as const),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `hahFinal${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `hahInitial${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `hahIsolated${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `hahMedial${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `hehFinal${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `hehInitial${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `hehMedial${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map((name) => `i${name}LatinCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `jia${name}HanziCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `jing${name}HanziCount` as const),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `kafFinal${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `kafInitial${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `kafIsolated${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `kafMedial${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map((name) => `kappa${name}GreekCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `kieuk${name}HangulCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `l${name}LatinCount` as const),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `lamFinal${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `lamInitial${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `lamIsolated${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `lamMedial${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map((name) => `lambda${name}GreekCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `lamed${name}HebrewCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `m${name}LatinCount` as const),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `meemFinal${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `meemInitial${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `meemMedial${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map((name) => `mu${name}HanziCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `n${name}LatinCount` as const),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `noonFinal${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `noonIsolated${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map((name) => `o${name}LatinCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `omega${name}GreekCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `phi${name}GreekCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `pieup${name}HangulCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `psi${name}GreekCount` as const),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `qafFinal${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `qafIsolated${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `rehFinal${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `rehIsolated${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map((name) => `rho${name}GreekCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `s${name}LatinCount` as const),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `sadFinal${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `sadInitial${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `sadIsolated${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `sadMedial${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `seenFinal${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `seenInitial${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `seenIsolated${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `seenMedial${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map((name) => `shang${name}HanziCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `shen${name}HanziCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `sigma${name}GreekCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `t${name}LatinCount` as const),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `tahFinal${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `tahInitial${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `tahIsolated${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `tahMedial${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map((name) => `tav${name}HebrewCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `tian${name}HanziCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `tu${name}HanziCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `tuSoil${name}HanziCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `u${name}LatinCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `w${name}LatinCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `wang${name}HanziCount` as const),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `wawFinal${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `wawIsolated${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map((name) => `x${name}LatinCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `y${name}LatinCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `ya${name}HangulCount` as const),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `yehFinal${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map(
    (name) => `yehIsolated${name}ArabicCount` as const,
  ),
  ...LETTER_ORIENTATION_NAMES.map((name) => `yeo${name}HangulCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `yo${name}HangulCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `you${name}HanziCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `yu${name}HangulCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `yu${name}KatakanaCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `z${name}LatinCount` as const),
] as const;

/**
 * The key of every numeric characteristic an evaluator under `submatrix/`,
 * `path/`, or `compound/` fills — each structural count listed here and every
 * letter key — in alphabetical order. Each is the `metadata.key` of exactly
 * one registered evaluator whose `valueType` is `"number"`, and
 * `CharacteristicsModule`'s own test holds the two sets equal in both
 * directions.
 */
export const NUMERIC_CHARACTERISTIC_KEYS = (
  [
    "bettiNumber0Count",
    "bettiNumber1Count",
    "bottomBorderTouchCount",
    "cornerCount",
    "crossCount",
    "density",
    "dotCount",
    "doubleHorizontalEdgeCount",
    "doubleVerticalEdgeCount",
    "eastEdgeCount",
    "eastForkCount",
    "edgeCount",
    "embeddedUCount",
    "forkCount",
    "freeEndCount",
    "horizontalRectangleCount",
    "inflectionCount",
    "inkPointCount",
    "longestHorizontalRunLength",
    "longestVerticalRunLength",
    "maxMonotonicTurnLength",
    "northEastCornerCount",
    "northEdgeCount",
    "northForkCount",
    "northWestCornerCount",
    "southEastCornerCount",
    "southEdgeCount",
    "southForkCount",
    "southWestCornerCount",
    "tightestTurnCount",
    "tileCrossingComponentDeltaCount",
    "tileCrossingCount",
    "tileCrossingCycleCount",
    "topBorderTouchCount",
    "totalTurnCount",
    "verticalRectangleCount",
    "westEdgeCount",
    "westForkCount",
    ...LETTER_CHARACTERISTIC_KEYS,
  ] as const
).toSorted();

/**
 * The key of every boolean characteristic, in alphabetical order — the
 * `metadata.key` of exactly one registered evaluator whose `valueType` is
 * `"boolean"`.
 */
export const BOOLEAN_CHARACTERISTIC_KEYS = [
  "endsAreLatticeNeighbors",
  "endsOnBorderRules",
  "isArcade",
  "isBars",
  "isBoxes",
  "isChain",
  "isClasps",
  "isClosedLoop",
  "isComb",
  "isCross",
  "isDots",
  "isDoubleChain",
  "isFork",
  "isLines",
  "isMesh",
  "isParallel",
  "isPureTree",
  "isSingleArc",
  "isSnake",
  "isStippled",
  "isSwirl",
  "isWaterfalls",
  "isWhirl",
  "reversesAtItsTightestTurn",
] as const;

/**
 * Every characteristic key, numeric keys first and boolean keys after, each
 * run alphabetical — the order `CharacteristicsService` lists
 * metadata in and fills a record in.
 */
export const CHARACTERISTIC_KEYS = [
  ...NUMERIC_CHARACTERISTIC_KEYS,
  ...BOOLEAN_CHARACTERISTIC_KEYS,
] as const;

/**
 * Every key a meander row's `characteristics` map may hold `true` under, in
 * the order a caption lists them: each boolean characteristic, then
 * `isReducible`, which is a fact about the Code as filed rather than any
 * evaluator's value.
 */
export const STORED_BOOLEAN_KEYS = [
  ...BOOLEAN_CHARACTERISTIC_KEYS,
  "isReducible",
] as const;

/**
 * {@link BOOLEAN_CHARACTERISTIC_KEYS} as a set of plain strings, so an
 * unchecked key read off a discovered provider can be looked up without
 * first being narrowed to the key union it is being checked against.
 */
export const BOOLEAN_CHARACTERISTIC_KEY_SET: ReadonlySet<string> = new Set(
  BOOLEAN_CHARACTERISTIC_KEYS,
);

/** {@link CHARACTERISTIC_KEYS} as a set of plain strings, for the same reason. */
export const CHARACTERISTIC_KEY_SET: ReadonlySet<string> = new Set(
  CHARACTERISTIC_KEYS,
);

/**
 * Thrown when the evaluators registered with `CharacteristicsModule`
 * disagree with the key lists above — a key with no evaluator, an evaluator
 * whose key is unknown or claimed twice, or a value of the wrong type — so
 * a record is never filled with a field missing or mistyped.
 */
export class CharacteristicRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CharacteristicRegistryError";
  }
}
