// ♟️ Constants
import path from "node:path";

import { z } from "zod";

import { aspectBodies } from "../src/modules/caelundas/caelundas.constants";

import { referenceFixtureSchema } from "./reference-fixtures.constants";

/** Where committed reference longitude fixtures live, one `<name>.json` each. */
export const REFERENCE_LONGITUDES_DIRECTORY = path.join(
  import.meta.dirname,
  "reference-longitudes",
);

const bodySchema = z.enum(aspectBodies);
const minuteSchema = z.iso.datetime({ offset: false });

/** An expected stellium boundary (no `end`) or span. */
const stelliumEventSchema = z.strictObject({
  end: minuteSchema.optional(),
  start: minuteSchema,
  summary: z.string().min(1),
});

/**
 * Ecliptic longitudes captured around each stellium boundary, with the
 * Horizons COMMAND for every body so the capture can be repeated, and the
 * boundaries and spans those positions imply.
 */
export const stelliumLongitudeFixtureSchema = z.strictObject({
  boundaries: z.array(stelliumEventSchema).min(1),
  longitudesByMinute: z.record(
    minuteSchema,
    z.partialRecord(bodySchema, z.number().min(0).lt(360)),
  ),
  name: z.string().min(1),
  note: z.string().min(1),
  retrieved: z.iso.date(),
  source: referenceFixtureSchema.extend({
    commandByBody: z.partialRecord(bodySchema, z.string().min(1)),
  }),
  spans: z.array(stelliumEventSchema.required({ end: true })).min(1),
});
