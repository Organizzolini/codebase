# Database: Shared Postgres Package

## Quick Start

**Type**: NestJS library package (`@codebase/database`)

**Purpose**: The one way a database-backed project connects to Postgres:
the `<PROJECT>_POSTGRES_*` environment fragment, the TypeORM options factory,
and the naming convention behind them. See the [README](README.md) for the
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
      database-testing.*.ts         # startDatabaseTestingModule, the testing entry's Nest helper
      database.constants.ts         # Variable suffixes and connection defaults
      database.factories.ts         # postgresDataSourceOptions
      database.types.ts
      database.utilities.ts         # postgresEnvironmentSchema, postgresConnection
testing/                            # Vitest setup
```

## Development

### Rules this package holds

- **Never read an unprefixed `POSTGRES_*` variable.** They are the shared
  container's admin login, loaded by Nx into every task.
- **Never let `synchronize` or `migrationsRun` be configured on.** The schema
  changes only through reviewed migrations, run as their own step.
- **Never name a schema in code.** It comes from `<PROJECT>_POSTGRES_SCHEMA`.

### Key Commands

```bash
nx run database:typecheck-code,lint-code,format-code,deprecate-code,guard-code
nx run database:vitest:unit
nx run database:type-coverage
```

See the [write-typescript skill](../../.agents/skills/write-typescript/SKILL.md)
and the [testing-strategy skill](../../.agents/skills/testing-strategy/SKILL.md).
