import { availableParallelism } from "node:os";

import { z } from "zod";

import { DEFAULT_DATABASE_NAME } from "./modules/database/database.constants";
import { EDGE_BUDGET } from "./modules/enumeration/enumeration.constants";

// 🌱 Add environment schema fields here
export const environmentSchema = z.object({
  DRAW_EDGE_BUDGET: z.coerce.number().int().positive().default(EDGE_BUDGET),
  DRAW_MAXIMUM_COLUMNS: z.coerce
    .number()
    .int()
    .positive()
    .default(Number.MAX_SAFE_INTEGER),
  DRAW_MAXIMUM_ROWS: z.coerce
    .number()
    .int()
    .positive()
    .default(Number.MAX_SAFE_INTEGER),
  // How many worker threads a draw run draws its meanders across: every core but the one
  // the main thread inserts rows on. Zero draws them in-process instead.
  DRAW_WORKERS: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(Math.max(availableParallelism() - 1, 0)),
  MEANDERAW_POSTGRES_DB: z.string().default(DEFAULT_DATABASE_NAME),
  MEANDERAW_POSTGRES_HOST: z.string().default("localhost"),
  MEANDERAW_POSTGRES_PASSWORD: z.string().default("postgres"),
  MEANDERAW_POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
  MEANDERAW_POSTGRES_SCHEMA: z.string().default(DEFAULT_DATABASE_NAME),
  MEANDERAW_POSTGRES_USER: z.string().default("postgres"),
});
