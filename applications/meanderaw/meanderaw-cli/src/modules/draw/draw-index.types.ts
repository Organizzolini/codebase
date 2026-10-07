// 🏷️ Types

import type { PatternCharacteristicKey } from "../characteristics/characteristics.types";
import type { MeanderPatternShapeCount } from "../database/database.types";
import type { Meander } from "../database/entities/Meander.entity";

/**
 * One page's HTML, a piece at a time: read lazily from the database as it
 * is written, or already in hand for a page small enough to be one piece.
 */
export type MeanderPageContent = AsyncIterable<string> | Iterable<string>;

/**
 * Where the pages' rows come from: how many each pattern holds for at each
 * shape, known before any row is read, and one pattern's rows in the order
 * its page lists them — by rows, then columns, then Code — a batch at a time.
 */
export interface MeanderPageSource {
  readonly counts: readonly MeanderPatternShapeCount[];
  rows(key: PatternCharacteristicKey): MeanderRowBatches;
}

/** One pattern's rows in page order, a batch at a time, read lazily or already in hand. */
export type MeanderRowBatches =
  | AsyncIterable<readonly Meander[]>
  | Iterable<readonly Meander[]>;
