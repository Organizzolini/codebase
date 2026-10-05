# 0020: Store Meanders in Postgres

Supersedes the storage half of [ADR 0012](0012-root-every-meander-in-a-committed-sqlite-table.md). The pipeline, the two halves of the corpus, and the index pages it describes stand.

Superseded in part by [ADR 0021](0021-stop-committing-the-meander-pages.md), which keeps writing the index pages but stops committing them.

## Context

[ADR 0012](0012-root-every-meander-in-a-committed-sqlite-table.md) persisted every meander as a row in `output/meanders.sqlite`, a better-sqlite3 file committed to git. By the time of this decision the file was 21 MB and had been rewritten in 21 commits. Every rewrite added another copy of a binary that no pull request could review. [ADR 0017](0017-store-letter-counts-as-a-sparse-json-map.md) had already counted the file's size against git as a design constraint.

The rest of the workspace already runs Postgres. There is a local `postgres:18-alpine` container, and lexico persists through TypeORM's `postgres` driver. Postgres is also where the planned in-cluster database will live.

## Decision

In development, meanders live in a Postgres database named `meanderaw_development`, inside a schema of the same name. The name joins the application and its environment. Development is the only environment for now. The local Docker init creates both the database and the schema, because TypeORM's synchronize creates tables but never a schema. The server, credentials, database, and schema all come from `MEANDERAW_POSTGRES_*` variables: `MEANDERAW_POSTGRES_DB` and `MEANDERAW_POSTGRES_SCHEMA` both default to `meanderaw_development`, and a later environment changes only them. The `MEANDERAW_` prefix keeps every variable unique to the application. Nx loads the workspace root's `.env` into every task, and that file's unprefixed `POSTGRES_DB` names lexico's shared `postgres` database, so an unprefixed name would collide with it.

`output/meanders.sqlite` is deleted. The HTML pages rebuilt from the database are the only artifact a sweep commits.

- **`id` is a uuidv7** that Postgres 18's native `uuidv7()` assigns on insert, not a sequence. TypeORM only generates version 4 uuids, and a bulk `insert` skips the per-entity hooks that could generate one in the application.
- **`code` alone is unique.** The formatted Code, `{columns}x{rows}y{lattice}` with an `r{repeats}` suffix past one repeat, already spells out the lattice address [ADR 0007](0007-address-every-meander-by-its-lattice.md) defines. Lookups go through the Code rather than a `(lattice, rows, columns)` triple.
- **Columns are snake case** (`is_hardcoded`), through the same `SnakeNamingStrategy` lexico uses, so raw SQL never quotes one.
- **`characteristics` is `jsonb`.** Raw SQL reads a key as `COALESCE((characteristics ->> 'key')::numeric, 0)`. A single Characteristic can now take a GIN or expression index, which [ADR 0017](0017-store-letter-counts-as-a-sparse-json-map.md) noted a text JSON column could not.
- **Integration tests start a throwaway Postgres 18 container** per suite through `@testcontainers/postgresql`, replacing in-memory SQLite. That way they exercise the same driver, column types, and `uuidv7()` default as the real database.

## Consequences

- Running `nx run meanderaw-cli:start` needs the local Postgres container (`nx run codebase:postgres-container:up`). Running the integration suites needs Docker.
- A clone of the repository no longer carries the rows. They are reproduced by sweeping, and the committed pages are the reviewable record of what a sweep produced.
- A row's `id` changes on every sweep. Committed output must key on the Code instead: the index pages name each tile's SVG element `meander-<code>`, so they change only when a drawing does.
- `clear` is a `TRUNCATE`. With no sequence there is no counter to restart, which is the job the SQLite version's `sqlite_sequence` reset did.
- Every connection still runs `synchronize: true` with no migrations. That remains safe while the CLI is the database's only writer. A second consumer would need [lexico-entities](../../packages/lexico-entities)' migration discipline.
