// 🏷️ Types

import type { MeanderFamily } from "../classification/classification.types";
import type { Meander } from "./entities/meander.entity";
import type { UpdatableEntity } from "@codebase/database";

/** How many rows one family holds at one shape. */
export interface MeanderFamilyShapeCount {
  readonly columns: number;
  readonly count: number;
  readonly family: MeanderFamily;
  readonly rows: number;
}

/**
 * The fields needed to persist one meander row — everything but the
 * columns the database fills itself: the `id` and the audit columns.
 */
export type MeanderRecord = Omit<Meander, keyof UpdatableEntity>;

/** How wide and how deep one repeat is. */
export interface MeanderShape {
  readonly columns: number;
  readonly rows: number;
}
