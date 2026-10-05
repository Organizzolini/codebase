import { z } from "zod";

// 🌱 Add environment schema fields here
export const environmentSchema = z.object({
  END_DATE: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "END_DATE must be in YYYY-MM-DD format")
    .optional(),
  LATITUDE: z.coerce.number().min(-90).max(90).optional(),
  LONGITUDE: z.coerce.number().min(-180).max(180).optional(),
  OUTPUT_DIRECTORY: z.string().optional().default("./output"),
  START_DATE: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "START_DATE must be in YYYY-MM-DD format")
    .optional(),
});
