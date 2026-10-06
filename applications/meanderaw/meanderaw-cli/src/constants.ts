import { availableParallelism } from "node:os";

import { z } from "zod";

import { postgresEnvironmentSchema } from "@codebase/database";

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
  ...postgresEnvironmentSchema({ project: "meanderaw" }),
});
