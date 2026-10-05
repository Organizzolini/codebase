# 0022: Give Every Database Project Its Own Database, Schema, and Role

Supersedes the naming, environment, and synchronize parts of [ADR 0020](0020-store-meanders-in-postgres.md). Its choice of Postgres over a committed SQLite file, its `uuidv7()` ids, its snake case, and its Testcontainers suites stand.

## Context

Every project that keeps data in Postgres did it its own way. Lexico kept its tables in the default `postgres` database under `public`, named that schema on every entity, ran real migrations from its command-line data source, and synchronized from its runtime module. Meanderaw, after [ADR 0020](0020-store-meanders-in-postgres.md), kept its table in a database and a schema both named `meanderaw_development`, and synchronized rather than migrated. Caelundas, about to store the events it detects, had no database yet. Each wrote its own environment variables, connection wiring, naming strategy, and Testcontainers harness.

Nx loads the workspace root's `.env` into every task. That file's unprefixed `POSTGRES_*` are the shared container's admin login, so any project reading them inherited another project's database. Meanderaw escaped by prefixing its variables `MEANDERAW_POSTGRES_*`.

Staging and production will later run on Kubernetes against one central Postgres instance, with the command-line applications run as pods. Three conventions would make that three deployments.

## Decision

**One instance, and per domain one database, one schema, and one role.** A domain is `lexico`, `meanderaw`, or `caelundas`; lexico's API, ingestion command line, and entities package share one.

| Context           | Database                                     | Schema      | Role                                        |
| ----------------- | -------------------------------------------- | ----------- | ------------------------------------------- |
| Local Docker      | `<project>_development`                      | `<project>` | `<project>_username` / `<project>_password` |
| Testcontainers    | `<project>_testing`                          | `<project>` | the same                                    |
| Kubernetes, later | `<project>_staging` / `<project>_production` | `<project>` | provisioned by that deployment              |

The database name carries the environment; the schema name never does. TypeORM writes schema names into the SQL of every migration it generates, so an environment-free schema is what lets a migration generated locally apply anywhere unchanged. The role owns its database and its schema.

**Every project reads only its own `<PROJECT>_POSTGRES_*` variables**: `_HOST`, `_PORT`, `_USERNAME`, `_PASSWORD`, `_DATABASE`, and `_SCHEMA`, for example `LEXICO_POSTGRES_DATABASE`. The last four default from the project's name, so a fresh checkout connects with no `.env` edits. The names are spelled out in full rather than copying the official Postgres image's `POSTGRES_DB` and `POSTGRES_USER`. The root's unprefixed `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` keep the image's own names, because the image and the healthcheck read them: they stay the shared container's admin login, and the root `postgres-data` targets', and no application reads them.

**One shared package, [`@codebase/database`](../../packages/database).** It holds the environment fragment each application spreads into its schema, the TypeORM options factory, `DatabaseModule.forRoot`, the command-line `createDataSource`, the base entities, the Testcontainers harness behind its `testing` entry, the migration SQL extraction script, and the `migration` Nx target defaults.

**Migrations everywhere.** `synchronize` is never on: the options factory hard-codes it off, and the test harness builds every schema by running the project's real migrations. Each project keeps its own database module at `src/modules/<project>-database/`, so the class derived from the folder is `<Project>DatabaseModule` and imports the shared `DatabaseModule` with no alias. That folder holds the command-line data source, `data-source.constants.ts`, and the `migrations/` folder. The project declares `"migration": { "options": { "module": "src/modules/<project>-database" } }`, and every configuration of the shared target reads both paths from that one option.

**No migrations on application start.** `migrationsRun` is hard-coded off too, and `DatabaseModule.forRoot` takes no migrations at all. Migrations run as their own step, `nx run <project>:migration:run` now and a Kubernetes Job later, because several pods starting together would otherwise race on the same DDL.

**The local container creates every domain on its first start.** The Compose `postgres` service lists the domains in `POSTGRES_PROJECTS`, and its one init script loops over them, creating each role, its `_development` database, and, connected to that database, its schema. Adding a domain is adding one word to that list. That init runs only on an empty volume. It is a separate instance from the Testcontainers one: Compose keeps the persistent `_development` database, and each test run creates an ephemeral `_testing` database in a throwaway container.

## Consequences

- `nx run codebase:postgres-container:recreate` gives a working setup for every project, but it deletes the volume, and with it any data held there, such as lexico's ingested rows.
- A developer keeping an existing volume runs the same init script by hand instead, once for each domain the volume lacks, after `nx run codebase:postgres-container:up` has recreated the container with the new list. For caelundas:

  ```bash
  docker exec -e POSTGRES_PROJECTS=caelundas postgres sh /docker-entrypoint-initdb.d/databases.sh
  ```

  The script stops at the first `CREATE` whose object already exists, so name only the missing domains. Meanderaw's database already exists from [ADR 0020](0020-store-meanders-in-postgres.md)'s init, so it takes the script's statements through `psql`, with an `ALTER DATABASE` in place of the `CREATE DATABASE`:

  ```bash
  docker exec -i postgres psql -U postgres -d postgres <<'SQL'
  CREATE ROLE meanderaw_username LOGIN PASSWORD 'meanderaw_password';
  ALTER DATABASE meanderaw_development OWNER TO meanderaw_username;
  \connect meanderaw_development
  CREATE SCHEMA meanderaw AUTHORIZATION meanderaw_username;
  SQL
  ```

  `\l`, `\dn`, and `\du` in `psql` confirm the databases, schemas, and roles.

- Every database-backed project now needs a migration for every schema change, including a first one for meanderaw's `meanders` table and caelundas' `events` table.
- Lexico's tables move from `postgres`.`public` to `lexico_development`.`lexico`, through a one-time dump and restore its own README documents.
- Integration suites need Docker, as they already did, and every suite now also exercises the project's migrations.
- The Kubernetes deployment needs no application change: every connection detail is an environment variable, and the schema in every migration is already the one each environment uses.
