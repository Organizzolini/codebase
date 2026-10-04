// ♟️ Constants

/**
 * The path the committed database opens at when the CLI runs for real,
 * relative to the project root every Nx target already runs from — the same
 * convention `DEFAULT_OUTPUT_DIRECTORY` follows for the SVG tree it sits
 * beside.
 */
export const DEFAULT_DATABASE_PATH = "output/meanders.sqlite";

/**
 * How many rows `DatabaseService.saveAll` writes per statement.
 *
 * A bound rather than a tuning knob. One statement's parameter count is
 * limited, so a whole shape's worth of rows in one statement would be
 * reaching a limit nobody declared — the sweep's widest shape alone holds
 * 16,512 of them. A row carries nine columns, every Characteristic sharing
 * the one `characteristics` map, so five hundred rows bind about five
 * thousand parameters, well under what the `better-sqlite3` driver admits;
 * `DatabaseService`'s integration test writes more than two chunks to hold
 * that true.
 */
export const MEANDER_INSERT_CHUNK_SIZE = 500;
