// ♟️ Constants

/**
 * The Postgres database, and the schema inside it, every meander is
 * persisted to unless `POSTGRES_DB` and `POSTGRES_SCHEMA` say otherwise: the
 * application's name and its environment, joined. Development is the only
 * environment so far; the local Docker init creates both.
 *
 * This project's own `.env` sets `POSTGRES_DB` too, and must: Nx loads the
 * workspace root's `.env` into every task as well, and that file names
 * lexico's shared `postgres` database, which this project's file overrides.
 * Without it the connection would reach `postgres` and fail there rather
 * than write, since no `meanderaw_development` schema exists in it.
 */
export const DEFAULT_DATABASE_NAME = "meanderaw_development";

/**
 * How many rows `DatabaseService.saveAll` writes per statement.
 *
 * A bound rather than a tuning knob. One statement's parameter count is
 * limited, so a whole shape's worth of rows in one statement would be
 * reaching a limit nobody declared — the sweep's widest shape alone holds
 * 16,512 of them. A row binds eight parameters, its `id` defaulting in the
 * database, so five hundred rows bind about four thousand, well under the
 * 65,535 one Postgres statement admits; `DatabaseService`'s integration test
 * writes more than two chunks to hold that true.
 */
export const MEANDER_INSERT_CHUNK_SIZE = 500;
