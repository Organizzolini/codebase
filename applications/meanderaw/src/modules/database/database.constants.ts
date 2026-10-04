// ♟️ Constants

/**
 * The Postgres database, and the schema inside it, every meander is
 * persisted to unless `MEANDERAW_POSTGRES_DB` and `MEANDERAW_POSTGRES_SCHEMA`
 * say otherwise: the application's name and its environment, joined.
 * Development is the only environment so far; the local Docker init creates
 * both.
 *
 * Every variable carries the `MEANDERAW_` prefix so none can collide with
 * another project's: Nx loads the workspace root's `.env` into every task,
 * and that file's unprefixed `POSTGRES_DB` names lexico's shared `postgres`
 * database.
 */
export const DEFAULT_DATABASE_NAME = "meanderaw_development";

/**
 * How many rows `DatabaseService.saveAll` writes per statement.
 *
 * A bound rather than a tuning knob. One statement's parameter count is
 * limited, so a whole shape's worth of rows in one statement would be
 * reaching a limit nobody declared — the draw run's largest shape alone holds
 * 4,196,352 of them. A row binds nine parameters, its `id` defaulting in the
 * database, so five hundred rows bind about four and a half thousand, well
 * under the 65,535 one Postgres statement admits; `DatabaseService`'s
 * integration test writes more than two chunks to hold that true.
 */
export const MEANDER_INSERT_CHUNK_SIZE = 500;

/**
 * How many rows `DatabaseService.familyRows` reads at once.
 *
 * Enough that a family of a million rows is a couple of hundred queries
 * rather than a million, few enough that one batch — every row's
 * Characteristics map included — is a few megabytes in memory rather than
 * the whole family at once, which is what lets the pages be written at any
 * edge budget.
 */
export const MEANDER_READ_BATCH_SIZE = 5000;
