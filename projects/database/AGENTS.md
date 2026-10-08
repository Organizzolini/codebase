# Database: Shared Postgres Package

## Quick Start

**Type**: NestJS library package (`@codebase/database`)

**Purpose**: The one way a database-backed project connects to Postgres:
the `<PROJECT>_POSTGRES_*` environment fragment, the TypeORM options factory,
the NestJS module and command-line data source built from it, and the naming
convention behind them. See the [README](README.md) for the
exports and the naming table.

This package must never import another workspace package, or every
database-backed project inherits that edge.

## Architecture Overview

### Tech Stack

- **ORM**: TypeORM against Postgres 18, with `typeorm-naming-strategies`' snake case
- **Env validation**: `zod`, as a fragment each application spreads into its own schema
- **Language**: Strict TypeScript

### Directory Layout

```text
src/
  index.ts                          # Public API
  modules/
    database/
      database.constants.ts         # Variable suffixes and connection defaults
      database.module.ts            # DatabaseModule.forRoot over TypeOrmModule.forRootAsync
      database.service.ts           # The TypeORM options factory forRoot hands TypeORM
      database.types.ts
      database.utilities.ts         # postgresEnvironmentSchema, postgresDataSourceOptions, createDataSource, variable names
      entities/                     # identifiable → creatable → updatable → deletable
      postgres-container.*.ts       # startPostgresContainer, the testing entry's harness
scripts/
  extract-migration-sql.ts          # Run by every project's migration:extract-sql-* target
testing/
  index.ts                          # The @codebase/database/testing entry
  database-testing.*.ts             # startDatabaseTestingModule, the entry's Nest helper
  fixtures/                         # The integration suites' entities, modules, and migration
  setup.ts, mocks.ts                # Vitest setup
```

## Development

### Rules this package holds

- **Never read an unprefixed `POSTGRES_*` variable.** They are the shared
  container's admin login, loaded by Nx into every task.
- **Never let `synchronize` or `migrationsRun` be configured on.** The schema
  changes only through reviewed migrations, run as their own step.
- **Never name a schema in code.** It comes from `<PROJECT>_POSTGRES_SCHEMA`.
- **Never run migrations from `DatabaseModule.forRoot`.** It takes none;
  `createDataSource` and `startPostgresContainer` do.
- **Keep the testing entry under `testing/`.** It imports `@nestjs/testing`,
  and dependency-cruiser's `no-test-imports-in-app` allows test tooling only
  from a `testing/` path, in this package and in every consumer that cruises
  into it.
- **Never name a real project in this package's tests.** Use `fixture`, and
  `sample` where a second is needed.
- **Never import GraphQL into the base entities.** Meanderaw and caelundas
  must not depend on it; lexico layers its `@Field` decorators on top.

### Key Commands

```bash
nx run database:typecheck-code,lint-code,format-code,deprecate-code,guard-code
nx run database:vitest:unit
nx run database:type-coverage
```

See the [write-typescript skill](../../.agents/skills/write-typescript/SKILL.md)
and the [testing-strategy skill](../../.agents/skills/testing-strategy/SKILL.md).
