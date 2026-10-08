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

/** The authority a reference fixture was captured from. */
export const referenceSourceSchema = z.strictObject({
  name: z.string().min(1),
  url: z.url(),
});

export const referenceFixtureSchema = z.strictObject({
  absent: z.array(z.string()).optional(),
  counts: z.record(z.string(), z.int().nonnegative()).optional(),
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
  source: referenceSourceSchema,
  toleranceMinutes: z.number().positive(),
  window: z.strictObject({
    endDate: z.iso.date(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    startDate: z.iso.date(),
  }),
});
