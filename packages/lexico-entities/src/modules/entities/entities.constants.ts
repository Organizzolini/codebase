// ♟️ Constants

import type { ValueTransformer } from "typeorm";

/**
 * Reads a `bigint` column as a JavaScript number. Postgres hands `bigint`
 * values to the driver as strings, whatever the entity declares, so a column
 * typed `number` holds a string unless it is parsed on the way out. Writing
 * passes the value, or a find operator wrapping it, through untouched.
 */
export const BIGINT_NUMBER_TRANSFORMER = {
  from: (value: null | number | string): null | number =>
    value === null ? null : Number(value),
  to: (value: unknown): unknown => value,
} satisfies ValueTransformer;
