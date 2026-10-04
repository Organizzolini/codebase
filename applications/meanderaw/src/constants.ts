import { z } from "zod";

import { DEFAULT_DATABASE_NAME } from "./modules/database/database.constants";
import { EDGE_BUDGET } from "./modules/enumeration/enumeration.constants";

// 🌱 Add environment schema fields here
export const environmentSchema = z.object({
  MEANDERAW_POSTGRES_DB: z.string().default(DEFAULT_DATABASE_NAME),
  MEANDERAW_POSTGRES_HOST: z.string().default("localhost"),
  MEANDERAW_POSTGRES_PASSWORD: z.string().default("postgres"),
  MEANDERAW_POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
  MEANDERAW_POSTGRES_SCHEMA: z.string().default(DEFAULT_DATABASE_NAME),
  MEANDERAW_POSTGRES_USER: z.string().default("postgres"),
  SWEEP_EDGE_BUDGET: z.coerce.number().int().positive().default(EDGE_BUDGET),
  SWEEP_MAXIMUM_COLUMNS: z.coerce
    .number()
    .int()
    .positive()
    .default(Number.MAX_SAFE_INTEGER),
  SWEEP_MAXIMUM_ROWS: z.coerce
    .number()
    .int()
    .positive()
    .default(Number.MAX_SAFE_INTEGER),
});
