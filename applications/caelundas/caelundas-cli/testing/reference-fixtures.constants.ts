// ♟️ Constants
import path from "node:path";

import { z } from "zod";

export const MILLISECONDS_PER_MINUTE = 60_000;

/** Where committed reference fixtures live, one `<name>.json` each. */
export const REFERENCE_FIXTURES_DIRECTORY = path.join(
  import.meta.dirname,
  "reference-fixtures",
);

const instantSchema = z.iso.datetime({ offset: false });

export const referenceFixtureSchema = z.strictObject({
  absent: z.array(z.string()).optional(),
  events: z
    .array(
      z.strictObject({
        end: instantSchema.optional(),
        note: z.string().optional(),
        start: instantSchema,
        summary: z.string().min(1),
        toleranceMinutes: z.number().positive().optional(),
      }),
    )
    .min(1),
  name: z.string().min(1),
  retrieved: z.iso.date(),
  source: z.strictObject({ name: z.string().min(1), url: z.url() }),
  toleranceMinutes: z.number().positive(),
  window: z.strictObject({
    endDate: z.iso.date(),
    latitude: z.number(),
    longitude: z.number(),
    startDate: z.iso.date(),
  }),
});
