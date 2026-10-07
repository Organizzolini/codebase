import { LETTER_CHARACTERISTIC_KEYS } from "../src/modules/characteristics/characteristics.constants";

import type {
  BooleanCharacteristicKey,
  Characteristics,
  LetterCharacteristicKey,
  NumericCharacteristicKey,
  NumericCharacteristicRecord,
} from "../src/modules/characteristics/characteristics.types";
import type { CodeObject } from "../src/modules/code/code.types";
import type { MeanderRecord } from "../src/modules/meanderaw-database/meanderaw-database.types";

/**
 * Builds characteristic records and meander rows for the tests that need a
 * whole one written out, so a case spells out only the fields it is about.
 *
 * Each structural count and boolean list is written out in full rather than derived
 * from the key lists, so the compiler checks it against the record types:
 * adding a characteristic key fails here until its default is added. The
 * letter zeros are derived from `LETTER_CHARACTERISTIC_KEYS` instead, since
 * sixteen keys per letter would outgrow the file, and checked complete when
 * built.
 */

// 🔧 Configuration

/** Every numeric characteristic but a letter at zero. */
const ZERO_STRUCTURAL_CHARACTERISTICS: Readonly<
  Record<Exclude<NumericCharacteristicKey, LetterCharacteristicKey>, number>
> = {
  bettiNumber0Count: 0,
  bettiNumber1Count: 0,
  bottomBorderTouchCount: 0,
  cornerCount: 0,
  crossCount: 0,
  density: 0,
  dotCount: 0,
  doubleHorizontalEdgeCount: 0,
  doubleVerticalEdgeCount: 0,
  eastEdgeCount: 0,
  eastForkCount: 0,
  edgeCount: 0,
  embeddedUCount: 0,
  forkCount: 0,
  freeEndCount: 0,
  horizontalRectangleCount: 0,
  inflectionCount: 0,
  inkPointCount: 0,
  longestHorizontalRunLength: 0,
  longestVerticalRunLength: 0,
  maxMonotonicTurnLength: 0,
  northEastCornerCount: 0,
  northEdgeCount: 0,
  northForkCount: 0,
  northWestCornerCount: 0,
  southEastCornerCount: 0,
  southEdgeCount: 0,
  southForkCount: 0,
  southWestCornerCount: 0,
  tightestTurnCount: 0,
  tileCrossingComponentDeltaCount: 0,
  tileCrossingCount: 0,
  tileCrossingCycleCount: 0,
  topBorderTouchCount: 0,
  totalTurnCount: 0,
  verticalRectangleCount: 0,
  westEdgeCount: 0,
  westForkCount: 0,
};

/** Every numeric characteristic at zero, letters included. */
export const ZERO_NUMERIC_CHARACTERISTICS: NumericCharacteristicRecord = {
  ...ZERO_STRUCTURAL_CHARACTERISTICS,
  ...zeroLetterCounts(),
};

/** Every boolean characteristic false. */
const FALSE_BOOLEAN_CHARACTERISTICS: Readonly<
  Record<BooleanCharacteristicKey, boolean>
> = {
  endsAreLatticeNeighbors: false,
  endsOnBorderRules: false,
  isArcade: false,
  isBars: false,
  isBoxes: false,
  isChain: false,
  isClasps: false,
  isClosedLoop: false,
  isComb: false,
  isCross: false,
  isDots: false,
  isDoubleChain: false,
  isFork: false,
  isLines: false,
  isMesh: false,
  isParallel: false,
  isPureTree: false,
  isSingleArc: false,
  isSnake: false,
  isSwirl: false,
  isWaterfalls: false,
  isWhirl: false,
  reversesAtItsTightestTurn: false,
};

// 🌎 Utilities

/** A whole characteristic record: every number zero and every boolean false, except the fields `overrides` names. */
export function characteristicRecord(
  overrides: Partial<Characteristics> = {},
): Characteristics {
  return {
    ...ZERO_NUMERIC_CHARACTERISTICS,
    ...FALSE_BOOLEAN_CHARACTERISTICS,
    ...overrides,
  };
}

/** A whole meander row at a one-column, two-row shape with every characteristic zero or false, except the fields `overrides` names. */
export function meanderRecord(
  overrides: Partial<MeanderRecord> & Pick<MeanderRecord, "code">,
): MeanderRecord {
  return {
    characteristics: {},
    columns: 1,
    isHardcoded: true,
    lattice: "0",
    repeats: 1,
    rows: 2,
    symmetricalCodes: [],
    ...overrides,
  };
}

/** The Code drawn `times` over side by side: each row repeated, columns multiplied. */
export function tiled(code: CodeObject, times: number): CodeObject {
  const rows = Array.from({ length: code.rows }, (_unused, row) =>
    code.digits
      .slice(row * code.columns, (row + 1) * code.columns)
      .repeat(times),
  );

  return { ...code, columns: code.columns * times, digits: rows.join("") };
}

/** Narrows a partial letter record to a complete one, throwing if a letter key was left out. */
function assertLetterCounts(
  counts: Partial<Record<LetterCharacteristicKey, number>>,
): asserts counts is Record<LetterCharacteristicKey, number> {
  const missing = LETTER_CHARACTERISTIC_KEYS.find(
    (key) => counts[key] === undefined,
  );
  if (missing !== undefined) {
    throw new Error(`Letter count "${missing}" is missing its zero`);
  }
}

/** Every letter glyph count at zero, built from the letter key list and checked complete. */
function zeroLetterCounts(): Readonly<Record<LetterCharacteristicKey, number>> {
  const counts: Partial<Record<LetterCharacteristicKey, number>> = {};
  for (const key of LETTER_CHARACTERISTIC_KEYS) {
    counts[key] = 0;
  }

  assertLetterCounts(counts);
  return counts;
}
