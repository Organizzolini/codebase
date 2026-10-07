// 🏷️ Types

import type { MeanderFamily } from "../classification/classification.types";
import type { Meander } from "../meanderaw-database/entities/meander.entity";
import type { MeanderFamilyShapeCount } from "../meanderaw-database/meanderaw-database.types";

/**
 * One page's HTML, a piece at a time: read lazily from the database as it
 * is written, or already in hand for a page small enough to be one piece.
 */
export type MeanderPageContent = AsyncIterable<string> | Iterable<string>;

/**
 * Where the pages' rows come from: how many each family holds at each shape,
 * known before any row is read, and one family's rows in the order its page
 * lists them — by rows, then columns, then Code — a batch at a time.
 */
export interface MeanderPageSource {
  readonly counts: readonly MeanderFamilyShapeCount[];
  rows(family: MeanderFamily): MeanderRowBatches;
}

/** One family's rows in page order, a batch at a time, read lazily or already in hand. */
export type MeanderRowBatches =
  | AsyncIterable<readonly Meander[]>
  | Iterable<readonly Meander[]>;
