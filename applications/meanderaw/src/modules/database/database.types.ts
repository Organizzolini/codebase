// 🏷️ Types

import type { MeanderFamily } from "../classification/classification.types";
import type { Meander } from "./entities/Meander.entity";

/** Where the meander database is, who to sign in as, and which schema holds its table. */
export interface MeanderDatabaseConnection {
  readonly database: string;
  readonly host: string;
  readonly password: string;
  readonly port: number;
  readonly schema: string;
  readonly username: string;
}

/** How many rows one family holds at one shape. */
export interface MeanderFamilyShapeCount {
  readonly columns: number;
  readonly count: number;
  readonly family: MeanderFamily;
  readonly rows: number;
}

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
