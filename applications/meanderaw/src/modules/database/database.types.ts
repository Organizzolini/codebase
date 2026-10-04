// 🏷️ Types

import type { Meander } from "./entities/Meander.entity";

/**
 * The fields needed to persist one meander row — everything but the
 * database's own auto-generated `id`.
 */
export type MeanderRecord = Omit<Meander, "id">;

/** How wide and how deep one repeat is. */
export interface MeanderShape {
  readonly columns: number;
  readonly rows: number;
}
