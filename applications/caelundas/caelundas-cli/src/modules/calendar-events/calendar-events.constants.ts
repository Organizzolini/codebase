// ♟️ Constants

/** The most bind parameters one Postgres statement accepts. */
export const POSTGRES_MAXIMUM_PARAMETERS = 65_535;

/** The database columns an upsert writes, each one bind parameter per row. */
export const CALENDAR_EVENT_INSERT_COLUMNS = [
  "categories",
  "color",
  "description",
  "end",
  "latitude",
  "location",
  "longitude",
  "start",
  "summary",
] as const;

/** The columns that identify an event, which a conflicting upsert matches on. */
export const CALENDAR_EVENT_CONFLICT_COLUMNS = [
  "summary",
  "start",
  "latitude",
  "longitude",
] as const;

/** The columns a conflicting upsert overwrites; `updated_at` advances on its own. */
export const CALENDAR_EVENT_UPDATE_COLUMNS = [
  "categories",
  "color",
  "description",
  "end",
  "location",
] as const;

/** Rows per `INSERT`, sized so a batch stays under {@link POSTGRES_MAXIMUM_PARAMETERS}. */
export const CALENDAR_EVENT_BATCH_SIZE = Math.floor(
  POSTGRES_MAXIMUM_PARAMETERS / CALENDAR_EVENT_INSERT_COLUMNS.length,
);

/** Decimal places the `latitude` and `longitude` columns store. */
export const COORDINATE_DECIMAL_PLACES = 6;
