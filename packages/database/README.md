# 🐘 Database

The shared Postgres package every database-backed project connects through.

## Purpose

Lexico, meanderaw, and caelundas each keep their tables in Postgres. This
package holds the one way they do it, so the environment variables, the
connection options, and the naming of each project's database, schema, and
role are written once:

| Context        | Database                | Schema      | Role                                        |
| -------------- | ----------------------- | ----------- | ------------------------------------------- |
| Local Docker   | `<project>_development` | `<project>` | `<project>_username` / `<project>_password` |
| Testcontainers | `<project>_testing`     | `<project>` | the same                                    |

The schema carries no environment, so a migration generated locally applies
anywhere unchanged.

| Export                       | Responsibility                                                                                 |
| ---------------------------- | ---------------------------------------------------------------------------------------------- |
| `postgresEnvironmentSchema`  | The zod fragment for a project's six `<PROJECT>_POSTGRES_*` variables, with defaults           |
| `postgresConnection`         | The connection those variables describe, read from any environment record                      |
| `postgresDataSourceOptions`  | TypeORM options: snake case, schema as search path, `synchronize` and `migrationsRun` off      |
| `DatabaseModule.forRoot`     | The NestJS module wiring TypeORM from those variables through `ConfigService`                  |
| `createDataSource`           | The `DataSource` a project's TypeORM command-line entry exports, from the same options         |
| `IdentifiableEntity` …       | Base entities: a `uuidv7()` id, then created, updated, and soft-deleted columns                |
| `startPostgresContainer`     | From `@codebase/database/testing`: a migrated Postgres 18 container laid out like local Docker |
| `startDatabaseTestingModule` | From `@codebase/database/testing`: a Nest testing module connected to such a container         |

## Usage

Spread the fragment into the application's environment schema. Every
variable is prefixed with the project's name, so the root's unprefixed
`POSTGRES_*` — the shared container's admin login — never reach it:

```ts
import { postgresEnvironmentSchema } from "@codebase/database";

export const environmentSchema = z.object({
  ...postgresEnvironmentSchema({ project: "lexico" }),
});
```

| Variable                   | Default              |
| -------------------------- | -------------------- |
| `LEXICO_POSTGRES_HOST`     | `localhost`          |
| `LEXICO_POSTGRES_PORT`     | `5432`               |
| `LEXICO_POSTGRES_USERNAME` | `lexico_username`    |
| `LEXICO_POSTGRES_PASSWORD` | `lexico_password`    |
| `LEXICO_POSTGRES_DATABASE` | `lexico_development` |
| `LEXICO_POSTGRES_SCHEMA`   | `lexico`             |

The root `.env`'s unprefixed `POSTGRES_DB`, `POSTGRES_USER`, and
`POSTGRES_PASSWORD` keep the official Postgres image's own names, which the
shared container and its healthcheck read.

Each project keeps its own database module at
`src/modules/<project>-database/`, so the class conformetry derives from the
folder is `<Project>DatabaseModule` and imports `DatabaseModule` with no
alias. It connects through `DatabaseModule.forRoot`, beside a global
`ConfigModule` that validates the same schema:

```ts
@Module({
  exports: [DatabaseModule],
  imports: [
    DatabaseModule.forRoot({
      entities: [Meander],
      project: "meanderaw",
    }),
  ],
})
export class MeanderawDatabaseModule {}
```

`forRoot` takes no migrations: the runtime never runs them. Beside the
module, at `src/modules/<project>-database/data-source.constants.ts`, export
the command-line data source from the same options, with the migrations. A
constants file allows no default export, so name it after the project; the
TypeORM command line finds the file's one `DataSource` export by itself:

```ts
export const meanderawDataSource = createDataSource({
  entities: [Meander],
  migrations: ["src/modules/meanderaw-database/migrations/*.ts"],
  project: "meanderaw",
});
```

Neither ever synchronizes or runs migrations on start: the schema changes
only through migrations, run on their own. Pass `namingStrategy` to replace
snake case, as lexico does with its pluralizing strategy.

### Base entities

Each table's entity extends the narrowest base it needs, so a table without
soft deletion carries no `deletedAt`:

| Base                 | Adds                                                                |
| -------------------- | ------------------------------------------------------------------- |
| `IdentifiableEntity` | `id`, a `uuid` the database assigns with Postgres 18's `uuidv7()`   |
| `CreatableEntity`    | `createdAt` (`timestamptz`) and a nullable `createdBy` (`uuid`)     |
| `UpdatableEntity`    | `updatedAt` (`timestamptz`) and a nullable `updatedBy` (`uuid`)     |
| `DeletableEntity`    | `deletedAt` (`timestamptz`, soft delete) and a nullable `deletedBy` |

They are plain TypeORM, with no GraphQL; a project that exposes them over
GraphQL adds its `@Field` decorators in a thin layer of its own. Nothing
fills the `*By` columns but the application, so a command-line writer with
no user identity leaves them empty. No entity names a schema: it comes from
`<PROJECT>_POSTGRES_SCHEMA`.

### Migrations

The `migration` target is defined once, in the root `nx.json` target
defaults. A database project opts in with one option, `module`, naming its
own database module's folder, which every configuration reads its two
conventional paths from:

```jsonc
// project.json
"migration": {
  "options": { "module": "src/modules/meanderaw-database" }
}
```

| Path                                | Holds                                                      |
| ----------------------------------- | ---------------------------------------------------------- |
| `<module>/data-source.constants.ts` | The `createDataSource(...)` the TypeORM command line reads |
| `<module>/migrations/`              | Each generated migration, and its extracted `.sql`         |

| Command                                         | Does                                                            |
| ----------------------------------------------- | --------------------------------------------------------------- |
| `nx run <project>:migration:generate`           | Generates a migration from the entities, extracts it, and lints |
| `nx run <project>:migration:run`                | Applies every pending migration                                 |
| `nx run <project>:migration:revert`             | Reverts the latest migration                                    |
| `nx run <project>:migration:show`               | Lists applied and pending migrations                            |
| `nx run <project>:migration:extract-sql-latest` | Extracts the latest migration's SQL for sqlfluff and squawk     |
| `nx run <project>:migration:extract-sql-all`    | Extracts every migration's SQL                                  |

Migrations never run on application start; running them is its own step.
The extraction script is `scripts/extract-migration-sql.ts`.

The extracted SQL is linted only once the project opts in to it as well: a
`framework:typeorm` tag, and three more empty entries beside `migration`:

```jsonc
// project.json
"tags": ["framework:typeorm"],
"targets": {
  "migration": { "options": { "module": "src/modules/meanderaw-database" } },
  "sqlfluff-format": {},
  "sqlfluff-lint": {},
  "squawk": {}
}
```

`migration:generate` ends by running `lint-code:write`, which fails on the
empty JSDoc blocks TypeORM writes into a new migration. Describe the class
and its `up` and `down` methods, then run `lint-code:write` again.

Every pooled connection pins its session's `search_path` to the project's
schema alone, with no `public` after it. Unqualified SQL lands in the
project's schema, or fails if that schema is missing, and TypeORM's
`current_schema()` fallback names it too, so a generated column's
`typeorm_metadata` row is planned under the project's schema with no edit.
Two hand edits remain after `migration:generate` writes a project's first
generated column or view:

- Create the metadata table before the first `INSERT` into it, with
  `CREATE TABLE IF NOT EXISTS "<project>"."typeorm_metadata" (...)`, and drop
  it in `down`. TypeORM creates it only when it synchronizes, which never
  happens here.
- Replace the generating database's name, a literal
  `<project>_development` among the parameters of the `INSERT` and the
  `DELETE`, with `current_database()` in their SQL. TypeORM matches the row
  by database when it reads the expression back, so a `_testing` or
  production database would otherwise see the column as changed.

### Integration tests

`@codebase/database/testing` starts a throwaway `postgres:18-alpine`, falling
back to Google's mirror of Docker Hub, laid out the way the local container
is: a `<project>_username` role owning a `<project>_testing` database with a
`<project>` schema in it. It then builds the schema by running the project's
real migrations, so every integration suite exercises them too.

A suite that boots Nest modules against the database uses
`startDatabaseTestingModule`. It starts that container, then compiles a
testing module with a global `ConfigModule` and `DatabaseModule.forRoot`
connected to it, the container's `<PROJECT>_POSTGRES_*` set on `process.env`
over any already there:

```ts
import { startDatabaseTestingModule } from "@codebase/database/testing";

const database = await startDatabaseTestingModule({
  entities: [Meander],
  imports: [DrawingModule],
  migrations: [InitialMigration1767225600000],
  project: "meanderaw",
  providers: [DrawCommand],
  validate: (config) => environmentSchema.parse(config),
});

const meanders = database.repository(Meander);
const command = database.module.get(DrawCommand);
// … database.dataSource, database.container

await database.close();
```

| Option           | Does                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------- |
| `project`        | Names the role, the `_testing` database, the schema, and the variables                   |
| `entities`       | Registered with `TypeOrmModule.forFeature`, and connected when no `database` is given    |
| `migrations`     | Run by the container before the module boots                                             |
| `imports`        | The modules under test                                                                   |
| `providers`      | The providers under test                                                                 |
| `database`       | The project's own `<Project>DatabaseModule`, imported in place of the helper's `forRoot` |
| `namingStrategy` | Replaces snake case on the helper's own `forRoot`                                        |
| `validate`       | The application's environment validation, usually `environmentSchema.parse`              |
| `images`         | Overrides the images tried, in order                                                     |

When the modules under test import the project's own database module, pass
it as `database` too, or the testing module connects twice; `database` and
`namingStrategy` cannot be combined, since the project's module sets its own.
`close` closes the module, stops the container, and restores the whole of
`process.env`, removing any default `validate` filled in.

`startPostgresContainer` alone suits a suite that needs no Nest module:

```ts
import { startPostgresContainer } from "@codebase/database/testing";

const container = await startPostgresContainer({
  migrations: [InitialMigration1767225600000],
  project: "meanderaw",
});

// … build a DataSource from postgresDataSourceOptions(container.connection, …)

await container.stop();
```

`connection` is the project's own role, never the container's admin login,
and `environment` is the same connection as `<PROJECT>_POSTGRES_*` variables.
Testcontainers and `@nestjs/testing` are dependencies of this entry, so a
consuming suite imports its types from here rather than redeclaring them.
The entry lives under `testing/` rather than `src/`: dependency-cruiser's
`no-test-imports-in-app` lets only a `testing/` path import test tooling, so
import it only from tests and `testing/` harnesses.
Docker must be running.

A project name must be lowercase letters, digits, and underscores, starting
with a letter, so it can prefix a variable and name a database unquoted.

## Test

```bash
nx run database:vitest
```

## 👔 Conformetry

This project was generated from the [nestjs-service-project](../../configuration/conformetry-templates/nestjs-service-project) conformetry template.

## 🕸️ Codependix

Dependency graphs exported by [codependix](https://github.com/Organizzolini/codebase/tree/main/packages/ic-suite/codependix/codependix-cli), regenerated by `nx run codebase:codependix:write`.

### Nx Neighborhood

<!-- codependix:start name="codependix-nx-projects" -->
```mermaid
graph LR
  caelundas_cli["caelundas-cli"]
  database["database"]
  lexico_api["lexico-api"]
  lexico_entities["lexico-entities"]
  lexico_ingestion["lexico-ingestion"]
  meanderaw_cli["meanderaw-cli"]
  caelundas_cli --> database
  lexico_api --> database
  lexico_entities --> database
  lexico_ingestion --> database
  meanderaw_cli --> database
  classDef subject fill:#7c3aed,color:#fff,stroke:#4c1d95,stroke-width:2px
  class database subject
```
<!-- codependix:end name="codependix-nx-projects" -->

### NestJS Module Graph

<!-- codependix:start name="codependix-nestjs-modules" -->
```mermaid
flowchart LR
  DatabaseModule
```
<!-- codependix:end name="codependix-nestjs-modules" -->

### File Imports

<!-- codependix:start name="codependix-file-imports" -->
```mermaid
graph LR
  file_callidescope_config_ts["callidescope.config.ts"]
  file_codependix_config_ts["codependix.config.ts"]
  file_codometer_config_ts["codometer.config.ts"]
  file_eslint_config_ts["eslint.config.ts"]
  file_scripts_extract_migration_sql_ts["scripts/extract-migration-sql.ts"]
  file_src_index_ts["src/index.ts"]
  file_src_modules_database_database_testing_utilities_integration_test_ts["src/modules/database/database-testing.utilities.integration.test.ts"]
  file_src_modules_database_database_constants_ts["src/modules/database/database.constants.ts"]
  file_src_modules_database_database_module_integration_test_ts["src/modules/database/database.module.integration.test.ts"]
  file_src_modules_database_database_module_ts["src/modules/database/database.module.ts"]
  file_src_modules_database_database_service_ts["src/modules/database/database.service.ts"]
  file_src_modules_database_database_service_unit_test_ts["src/modules/database/database.service.unit.test.ts"]
  file_src_modules_database_database_types_ts["src/modules/database/database.types.ts"]
  file_src_modules_database_database_utilities_ts["src/modules/database/database.utilities.ts"]
  file_src_modules_database_database_utilities_unit_test_ts["src/modules/database/database.utilities.unit.test.ts"]
  file_src_modules_database_entities_creatable_entity_ts["src/modules/database/entities/creatable.entity.ts"]
  file_src_modules_database_entities_deletable_entity_ts["src/modules/database/entities/deletable.entity.ts"]
  file_src_modules_database_entities_identifiable_entity_ts["src/modules/database/entities/identifiable.entity.ts"]
  file_src_modules_database_entities_updatable_entity_ts["src/modules/database/entities/updatable.entity.ts"]
  file_src_modules_database_postgres_container_constants_ts["src/modules/database/postgres-container.constants.ts"]
  file_src_modules_database_postgres_container_types_ts["src/modules/database/postgres-container.types.ts"]
  file_src_modules_database_postgres_container_utilities_integration_test_ts["src/modules/database/postgres-container.utilities.integration.test.ts"]
  file_src_modules_database_postgres_container_utilities_ts["src/modules/database/postgres-container.utilities.ts"]
  file_testing_database_testing_types_ts["testing/database-testing.types.ts"]
  file_testing_database_testing_utilities_ts["testing/database-testing.utilities.ts"]
  file_testing_fixtures_fixture_database_module_ts["testing/fixtures/fixture-database.module.ts"]
  file_testing_fixtures_gadget_entity_ts["testing/fixtures/gadget.entity.ts"]
  file_testing_fixtures_migrations_1767225600000_create_widgets_ts["testing/fixtures/migrations/1767225600000-create-widgets.ts"]
  file_testing_fixtures_sample_greeting_constants_ts["testing/fixtures/sample-greeting.constants.ts"]
  file_testing_fixtures_sample_greeting_module_ts["testing/fixtures/sample-greeting.module.ts"]
  file_testing_fixtures_sample_widgets_module_ts["testing/fixtures/sample-widgets.module.ts"]
  file_testing_fixtures_sample_widgets_service_ts["testing/fixtures/sample-widgets.service.ts"]
  file_testing_fixtures_widget_entity_ts["testing/fixtures/widget.entity.ts"]
  file_testing_index_ts["testing/index.ts"]
  file_testing_mocks_ts["testing/mocks.ts"]
  file_testing_setup_ts["testing/setup.ts"]
  file_vitest_config_ts["vitest.config.ts"]
  file_src_modules_database_database_testing_utilities_integration_test_ts --> file_src_modules_database_database_utilities_ts
  file_src_modules_database_database_testing_utilities_integration_test_ts --> file_testing_database_testing_types_ts
  file_src_modules_database_database_testing_utilities_integration_test_ts --> file_testing_database_testing_utilities_ts
  file_src_modules_database_database_testing_utilities_integration_test_ts --> file_testing_fixtures_fixture_database_module_ts
  file_src_modules_database_database_testing_utilities_integration_test_ts --> file_testing_fixtures_migrations_1767225600000_create_widgets_ts
  file_src_modules_database_database_testing_utilities_integration_test_ts --> file_testing_fixtures_sample_greeting_constants_ts
  file_src_modules_database_database_testing_utilities_integration_test_ts --> file_testing_fixtures_sample_greeting_module_ts
  file_src_modules_database_database_testing_utilities_integration_test_ts --> file_testing_fixtures_sample_widgets_module_ts
  file_src_modules_database_database_testing_utilities_integration_test_ts --> file_testing_fixtures_sample_widgets_service_ts
  file_src_modules_database_database_testing_utilities_integration_test_ts --> file_testing_fixtures_widget_entity_ts
  file_src_modules_database_database_module_integration_test_ts --> file_src_modules_database_database_module_ts
  file_src_modules_database_database_module_integration_test_ts --> file_src_modules_database_database_utilities_ts
  file_src_modules_database_database_module_integration_test_ts --> file_src_modules_database_postgres_container_types_ts
  file_src_modules_database_database_module_integration_test_ts --> file_src_modules_database_postgres_container_utilities_ts
  file_src_modules_database_database_module_integration_test_ts --> file_testing_fixtures_gadget_entity_ts
  file_src_modules_database_database_module_integration_test_ts --> file_testing_fixtures_migrations_1767225600000_create_widgets_ts
  file_src_modules_database_database_module_integration_test_ts --> file_testing_fixtures_widget_entity_ts
  file_src_modules_database_database_module_ts --> file_src_modules_database_database_constants_ts
  file_src_modules_database_database_module_ts --> file_src_modules_database_database_service_ts
  file_src_modules_database_database_module_ts --> file_src_modules_database_database_types_ts
  file_src_modules_database_database_service_ts --> file_src_modules_database_database_constants_ts
  file_src_modules_database_database_service_ts --> file_src_modules_database_database_types_ts
  file_src_modules_database_database_service_ts --> file_src_modules_database_database_utilities_ts
  file_src_modules_database_database_service_unit_test_ts --> file_src_modules_database_database_constants_ts
  file_src_modules_database_database_service_unit_test_ts --> file_src_modules_database_database_service_ts
  file_src_modules_database_database_types_ts --> file_src_modules_database_database_constants_ts
  file_src_modules_database_database_utilities_ts --> file_src_modules_database_database_constants_ts
  file_src_modules_database_database_utilities_ts --> file_src_modules_database_database_types_ts
  file_src_modules_database_database_utilities_unit_test_ts --> file_src_modules_database_database_types_ts
  file_src_modules_database_database_utilities_unit_test_ts --> file_src_modules_database_database_utilities_ts
  file_src_modules_database_entities_creatable_entity_ts --> file_src_modules_database_entities_identifiable_entity_ts
  file_src_modules_database_entities_deletable_entity_ts --> file_src_modules_database_entities_updatable_entity_ts
  file_src_modules_database_entities_updatable_entity_ts --> file_src_modules_database_entities_creatable_entity_ts
  file_src_modules_database_postgres_container_types_ts --> file_src_modules_database_database_types_ts
  file_src_modules_database_postgres_container_utilities_integration_test_ts --> file_src_modules_database_postgres_container_constants_ts
  file_src_modules_database_postgres_container_utilities_integration_test_ts --> file_src_modules_database_postgres_container_utilities_ts
  file_src_modules_database_postgres_container_utilities_integration_test_ts --> file_testing_fixtures_migrations_1767225600000_create_widgets_ts
  file_src_modules_database_postgres_container_utilities_ts --> file_src_modules_database_database_types_ts
  file_src_modules_database_postgres_container_utilities_ts --> file_src_modules_database_database_utilities_ts
  file_src_modules_database_postgres_container_utilities_ts --> file_src_modules_database_postgres_container_constants_ts
  file_src_modules_database_postgres_container_utilities_ts --> file_src_modules_database_postgres_container_types_ts
  file_testing_database_testing_types_ts --> file_src_modules_database_database_types_ts
  file_testing_database_testing_types_ts --> file_src_modules_database_postgres_container_types_ts
  file_testing_database_testing_utilities_ts --> file_src_modules_database_database_module_ts
  file_testing_database_testing_utilities_ts --> file_src_modules_database_postgres_container_utilities_ts
  file_testing_database_testing_utilities_ts --> file_testing_database_testing_types_ts
  file_testing_fixtures_fixture_database_module_ts --> file_src_modules_database_database_module_ts
  file_testing_fixtures_fixture_database_module_ts --> file_testing_fixtures_widget_entity_ts
  file_testing_fixtures_gadget_entity_ts --> file_src_modules_database_entities_identifiable_entity_ts
  file_testing_fixtures_sample_greeting_module_ts --> file_testing_fixtures_sample_greeting_constants_ts
  file_testing_fixtures_sample_widgets_module_ts --> file_testing_fixtures_fixture_database_module_ts
  file_testing_fixtures_sample_widgets_module_ts --> file_testing_fixtures_sample_widgets_service_ts
  file_testing_fixtures_sample_widgets_module_ts --> file_testing_fixtures_widget_entity_ts
  file_testing_fixtures_sample_widgets_service_ts --> file_testing_fixtures_widget_entity_ts
  file_testing_fixtures_widget_entity_ts --> file_src_modules_database_entities_deletable_entity_ts
```
<!-- codependix:end name="codependix-file-imports" -->

<!-- callidescope:start -->

## 🔭 Callidescope

Call stacks traced through `packages/database`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 35 |
| Files | 19 |
| Calls traced | 34 |
| Call stacks | 7 |
| Deepest stack | 4 |
| Stacks through recursion | 0 |
| Unfollowable calls | 0 |

### Limits

What this project is judged against, as declared in its own `callidescope.config.ts`.

| Limit | Value |
| --- | --- |
| `maximumDepth` | 4 |
| `maximumBreadth` | 4 |

### Call stacks (depth)

**1. `postgresEnvironmentSchema`** — depth 4 · orphan-root

```text
🚀 postgresEnvironmentSchema(…): PostgresEnvironmentShape<Project> [packages/database/src/modules/database/database.utilities.ts:200]
   ↳ The zod fragment for a project's `<PROJECT>_POSTGRES_*` variables, which each application spreads into its own…
  └─> assertPostgresEnvironmentKeys(…): void [packages/database/src/modules/database/database.utilities.ts:35]
     ↳ Holds `shape` to having a key for every one of `project`'s `<PROJECT>_POSTGRES_*` variables, which is what types {@link…
    └─> postgresEnvironmentKeys(project: string): string[] [packages/database/src/modules/database/database.utilities.ts:176]
       ↳ The `<PROJECT>_POSTGRES_*` variable names a project reads.
      └─> postgresEnvironmentKey(project: string, field: PostgresConnectionField): string [packages/database/src/modules/database/database.utilities.ts:162]
         ↳ The variable a project reads `field` from, for example `LEXICO_POSTGRES_DATABASE` for lexico's `database`.
```

**2. `DatabaseService.createTypeOrmOptions`** — depth 4 · orphan-root

```text
🚀 DatabaseService.createTypeOrmOptions(): PostgresDataSourceOptions [packages/database/src/modules/database/database.service.ts:76]
   ↳ TypeORM's options for the project's connection, with no migrations: the runtime never runs them.
  └─> DatabaseService.connection(): PostgresConnection [packages/database/src/modules/database/database.service.ts:61]
     ↳ Where the project's database is, read from its prefixed variables and defaulted from its name.
    └─> postgresConnection({ environment, project, }: PostgresConnectionSource): PostgresConnection [packages/database/src/modules/database/database.utilities.ts:86]
       ↳ The connection a project's prefixed variables describe, defaulted the way `postgresEnvironmentSchema` defaults them.
      └─> postgresEnvironmentKey(project: string, field: PostgresConnectionField): string [packages/database/src/modules/database/database.utilities.ts:162]
         ↳ The variable a project reads `field` from, for example `LEXICO_POSTGRES_DATABASE` for lexico's `database`.
```

**3. `main`** — depth 3 · orphan-root

```text
🚀 main(): Promise<void> [packages/database/scripts/extract-migration-sql.ts:172]
   ↳ Main.
  └─> parseMode(): Mode [packages/database/scripts/extract-migration-sql.ts:211]
     ↳ Parse mode.
    └─> find(…)(argument: string): boolean [packages/database/scripts/extract-migration-sql.ts:212]
```

<details>
<summary>4 more call stacks</summary>

**4. `createDataSource`** — depth 3 · orphan-root

```text
🚀 createDataSource(…): DataSource [packages/database/src/modules/database/database.utilities.ts:69]
   ↳ The `DataSource` a project's TypeORM command-line entry exports, built from the same options as…
  └─> postgresDataSourceOptions(…): PostgresDataSourceOptions [packages/database/src/modules/database/database.utilities.ts:116]
     ↳ The TypeORM options for `connection`, shared by every runtime module and command-line data source so a generated…
    └─> postgresSearchPathOption(schema: string): string [packages/database/src/modules/database/database.utilities.ts:230]
       ↳ The startup parameter pg sends as `options` on each pooled connection, setting the session's `search_path` to `schema`…
```

**5. `startPostgresContainer`** — depth 3 · orphan-root

```text
🚀 startPostgresContainer(…): Promise<StartedPostgresContainer> [packages/database/src/modules/database/postgres-container.utilities.ts:33]
   ↳ Starts a throwaway Postgres 18 laid out the way the local Docker one is — a `<project>_username` role owning a…
  └─> postgresConnection({ environment, project, }: PostgresConnectionSource): PostgresConnection [packages/database/src/modules/database/database.utilities.ts:86]
     ↳ The connection a project's prefixed variables describe, defaulted the way `postgresEnvironmentSchema` defaults them.
    └─> postgresEnvironmentKey(project: string, field: PostgresConnectionField): string [packages/database/src/modules/database/database.utilities.ts:162]
       ↳ The variable a project reads `field` from, for example `LEXICO_POSTGRES_DATABASE` for lexico's `database`.
```

**6. `visit`** — depth 2 · orphan-root

```text
🚀 visit(node: ts.Node): void [packages/database/scripts/extract-migration-sql.ts:71]
   ↳ Visit.
  └─> extractSqlFromLiteral(argument: ts.Expression, sourceFile: ts.SourceFile): string | undefined [packages/database/scripts/extract-migration-sql.ts:42]
     ↳ Extract sql from literal.
```

**7. `visit`** — depth 2 · orphan-root

```text
🚀 visit(node: ts.Node): void [packages/database/scripts/extract-migration-sql.ts:118]
   ↳ Visit.
  └─> extractSqlFromMethod(method: ts.MethodDeclaration, sourceFile: ts.SourceFile): string[] [packages/database/scripts/extract-migration-sql.ts:62]
     ↳ Extract sql from method.
```

</details>

### Breadth

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `main` | 4 | `parseMode`, `parseDirectory`, `findMigrationFiles`, `processMigrationFile` | `packages/database/scripts/extract-migration-sql.ts:172` |
| `DatabaseService.connection` | 4 | `DatabaseService.databaseOptions`, `postgresConnection`, `DatabaseService.map(…)`, `postgresEnvironmentKeys` | `packages/database/src/modules/database/database.service.ts:61` |
| `startPostgresContainer` | 4 | `postgresConnection`, `startFirstAvailableImage`, `postgresDataSourceOptions`, `postgresEnvironment` | `packages/database/src/modules/database/postgres-container.utilities.ts:33` |

<details>
<summary>15 more callables</summary>

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `postgresEnvironmentSchema` | 3 | `postgresSettingsSchema`, `postgresEnvironmentKey`, `assertPostgresEnvironmentKeys` | `packages/database/src/modules/database/database.utilities.ts:200` |
| `DatabaseService.createTypeOrmOptions` | 3 | `postgresDataSourceOptions`, `DatabaseService.connection`, `DatabaseService.databaseOptions` | `packages/database/src/modules/database/database.service.ts:76` |
| `findMigrationFiles` | 2 | `filter(…)`, `map(…)` | `packages/database/scripts/extract-migration-sql.ts:147` |
| `createDataSource` | 2 | `postgresDataSourceOptions`, `postgresConnection` | `packages/database/src/modules/database/database.utilities.ts:69` |
| `postgresConnection` | 2 | `postgresEnvironmentKey`, `postgresSettingsSchema` | `packages/database/src/modules/database/database.utilities.ts:86` |
| `visit` | 1 | `extractSqlFromLiteral` | `packages/database/scripts/extract-migration-sql.ts:71` |
| `visit` | 1 | `extractSqlFromMethod` | `packages/database/scripts/extract-migration-sql.ts:118` |
| `parseDirectory` | 1 | `find(…)` | `packages/database/scripts/extract-migration-sql.ts:197` |
| `parseMode` | 1 | `find(…)` | `packages/database/scripts/extract-migration-sql.ts:211` |
| `processMigrationFile` | 1 | `extractSqlFromMigration` | `packages/database/scripts/extract-migration-sql.ts:221` |
| `assertPostgresEnvironmentKeys` | 1 | `postgresEnvironmentKeys` | `packages/database/src/modules/database/database.utilities.ts:35` |
| `postgresDataSourceOptions` | 1 | `postgresSearchPathOption` | `packages/database/src/modules/database/database.utilities.ts:116` |
| `postgresEnvironment` | 1 | `postgresEnvironmentKey` | `packages/database/src/modules/database/database.utilities.ts:142` |
| `postgresEnvironmentKeys` | 1 | `postgresEnvironmentKey` | `packages/database/src/modules/database/database.utilities.ts:176` |
| `startFirstAvailableImage` | 1 | `postgresInitializationSql` | `packages/database/src/modules/database/postgres-container.utilities.ts:104` |

</details>
<!-- callidescope:end -->

<!-- codometer:start -->

## ⏲️ Codometer

### Project

![Lines of Code](https://img.shields.io/badge/Lines_of_Code-2469-22c55e?style=flat-square)
![Repository Size](https://img.shields.io/badge/Repository_Size-86.35_kB-6b7280?style=flat-square)
![Folders](https://img.shields.io/badge/Folders-8-4a4a4a?style=flat-square)
![Source Files](https://img.shields.io/badge/Source_Files-37-3178c6?style=flat-square)

### TypeScript

![TypeScript Files](https://img.shields.io/badge/TypeScript_Files-37-3178c6?style=flat-square)
![Interfaces](https://img.shields.io/badge/Interfaces-11-0ea5e9?style=flat-square)
![Generic Declarations](https://img.shields.io/badge/Generic_Declarations-6-0369a1?style=flat-square)
![Enums](https://img.shields.io/badge/Enums-0-f97316?style=flat-square)
![Decorators](https://img.shields.io/badge/Decorators-21-db2777?style=flat-square)
![Doc Comments](https://img.shields.io/badge/Doc_Comments-89-6366f1?style=flat-square)
![Static Methods](https://img.shields.io/badge/Static_Methods-1-166534?style=flat-square)

### JavaScript

![JavaScript Files](https://img.shields.io/badge/JavaScript_Files-0-f7df1e?style=flat-square)
![Test Files](https://img.shields.io/badge/Test_Files-5-10b981?style=flat-square)
![External Packages](https://img.shields.io/badge/External_Packages-13-8b5cf6?style=flat-square)
![Classes](https://img.shields.io/badge/Classes-14-7c3aed?style=flat-square)
![Functions](https://img.shields.io/badge/Functions-125-16a34a?style=flat-square)
![Methods](https://img.shields.io/badge/Methods-11-15803d?style=flat-square)
![Sync Functions](https://img.shields.io/badge/Sync_Functions-97-4ade80?style=flat-square)
![Async Functions](https://img.shields.io/badge/Async_Functions-39-059669?style=flat-square)
![Constants](https://img.shields.io/badge/Constants-103-dc2626?style=flat-square)
![Imports](https://img.shields.io/badge/Imports-128-0284c7?style=flat-square)
![Exported Symbols](https://img.shields.io/badge/Exported_Symbols-55-ea580c?style=flat-square)
![Comments](https://img.shields.io/badge/Comments-126-64748b?style=flat-square)
![Comment Lines](https://img.shields.io/badge/Comment_Lines-332-475569?style=flat-square)
![TODO Comments](https://img.shields.io/badge/TODO_Comments-0-ca8a04?style=flat-square)

### Python

![Python Files](https://img.shields.io/badge/Python_Files-0-3776ab?style=flat-square)
![Python Lines](https://img.shields.io/badge/Python_Lines-0-4b8bbe?style=flat-square)
![Python Classes](https://img.shields.io/badge/Python_Classes-0-7c3aed?style=flat-square)
![Python Functions](https://img.shields.io/badge/Python_Functions-0-16a34a?style=flat-square)
![Python Protocols](https://img.shields.io/badge/Python_Protocols-0-0ea5e9?style=flat-square)
![Python Constants](https://img.shields.io/badge/Python_Constants-0-dc2626?style=flat-square)
![Python Imports](https://img.shields.io/badge/Python_Imports-0-0284c7?style=flat-square)
![Python Decorators](https://img.shields.io/badge/Python_Decorators-0-db2777?style=flat-square)
![Docstrings](https://img.shields.io/badge/Docstrings-0-6366f1?style=flat-square)
![Docstring Lines](https://img.shields.io/badge/Docstring_Lines-0-818cf8?style=flat-square)
![Python Comments](https://img.shields.io/badge/Python_Comments-0-64748b?style=flat-square)
![Python Comment Lines](https://img.shields.io/badge/Python_Comment_Lines-0-475569?style=flat-square)

### JSON

![JSON Files](https://img.shields.io/badge/JSON_Files-4-a16207?style=flat-square)
![JSON Lines](https://img.shields.io/badge/JSON_Lines-164-ca8a04?style=flat-square)
![JSON Objects](https://img.shields.io/badge/JSON_Objects-37-7c3aed?style=flat-square)
![JSON Arrays](https://img.shields.io/badge/JSON_Arrays-14-8b5cf6?style=flat-square)
![JSON Properties](https://img.shields.io/badge/JSON_Properties-104-0284c7?style=flat-square)
![JSON Strings](https://img.shields.io/badge/JSON_Strings-87-16a34a?style=flat-square)
![JSON Numbers](https://img.shields.io/badge/JSON_Numbers-1-059669?style=flat-square)
![JSON Booleans](https://img.shields.io/badge/JSON_Booleans-8-0ea5e9?style=flat-square)
![JSON Nulls](https://img.shields.io/badge/JSON_Nulls-0-64748b?style=flat-square)
![JSON Items](https://img.shields.io/badge/JSON_Items-39-475569?style=flat-square)
![JSON Nodes](https://img.shields.io/badge/JSON_Nodes-147-dc2626?style=flat-square)
![JSON Max Depth](https://img.shields.io/badge/JSON_Max_Depth-7-ea580c?style=flat-square)

### YAML

![YAML Files](https://img.shields.io/badge/YAML_Files-0-cb171e?style=flat-square)
![YAML Lines](https://img.shields.io/badge/YAML_Lines-0-e34c26?style=flat-square)
![YAML Documents](https://img.shields.io/badge/YAML_Documents-0-f97316?style=flat-square)
![YAML Mappings](https://img.shields.io/badge/YAML_Mappings-0-7c3aed?style=flat-square)
![YAML Sequences](https://img.shields.io/badge/YAML_Sequences-0-8b5cf6?style=flat-square)
![YAML Keys](https://img.shields.io/badge/YAML_Keys-0-0284c7?style=flat-square)
![YAML Scalars](https://img.shields.io/badge/YAML_Scalars-0-16a34a?style=flat-square)
![YAML Anchors](https://img.shields.io/badge/YAML_Anchors-0-059669?style=flat-square)
![YAML Aliases](https://img.shields.io/badge/YAML_Aliases-0-10b981?style=flat-square)
![YAML Comments](https://img.shields.io/badge/YAML_Comments-0-64748b?style=flat-square)
![YAML Max Depth](https://img.shields.io/badge/YAML_Max_Depth-0-ea580c?style=flat-square)

### TOML

![TOML Files](https://img.shields.io/badge/TOML_Files-0-9c4221?style=flat-square)
![TOML Lines](https://img.shields.io/badge/TOML_Lines-0-b45309?style=flat-square)
![TOML Tables](https://img.shields.io/badge/TOML_Tables-0-7c3aed?style=flat-square)
![TOML Array Tables](https://img.shields.io/badge/TOML_Array_Tables-0-8b5cf6?style=flat-square)
![TOML Keys](https://img.shields.io/badge/TOML_Keys-0-0284c7?style=flat-square)
![TOML Arrays](https://img.shields.io/badge/TOML_Arrays-0-16a34a?style=flat-square)
![TOML Comments](https://img.shields.io/badge/TOML_Comments-0-64748b?style=flat-square)

### Shell

![Shell Files](https://img.shields.io/badge/Shell_Files-0-89e051?style=flat-square)
![Shell Lines](https://img.shields.io/badge/Shell_Lines-0-4eaa25?style=flat-square)
![Shell Functions](https://img.shields.io/badge/Shell_Functions-0-16a34a?style=flat-square)
![Shell Variables](https://img.shields.io/badge/Shell_Variables-0-0284c7?style=flat-square)
![Shell Exports](https://img.shields.io/badge/Shell_Exports-0-ea580c?style=flat-square)
![Shell Conditionals](https://img.shields.io/badge/Shell_Conditionals-0-7c3aed?style=flat-square)
![Shell Loops](https://img.shields.io/badge/Shell_Loops-0-8b5cf6?style=flat-square)
![Shell Pipelines](https://img.shields.io/badge/Shell_Pipelines-0-059669?style=flat-square)
![Shebangs](https://img.shields.io/badge/Shebangs-0-6b7280?style=flat-square)
![Shell Comments](https://img.shields.io/badge/Shell_Comments-0-64748b?style=flat-square)
![Shell Comment Lines](https://img.shields.io/badge/Shell_Comment_Lines-0-475569?style=flat-square)

### SQL

![SQL Files](https://img.shields.io/badge/SQL_Files-0-e38c00?style=flat-square)
![SQL Lines](https://img.shields.io/badge/SQL_Lines-0-f29111?style=flat-square)
![SQL Statements](https://img.shields.io/badge/SQL_Statements-0-7c3aed?style=flat-square)
![SQL Selects](https://img.shields.io/badge/SQL_Selects-0-16a34a?style=flat-square)
![SQL Inserts](https://img.shields.io/badge/SQL_Inserts-0-22c55e?style=flat-square)
![SQL Updates](https://img.shields.io/badge/SQL_Updates-0-0ea5e9?style=flat-square)
![SQL Deletes](https://img.shields.io/badge/SQL_Deletes-0-dc2626?style=flat-square)
![SQL Creates](https://img.shields.io/badge/SQL_Creates-0-0284c7?style=flat-square)
![SQL Joins](https://img.shields.io/badge/SQL_Joins-0-8b5cf6?style=flat-square)
![SQL CTEs](https://img.shields.io/badge/SQL_CTEs-0-059669?style=flat-square)
![SQL Comments](https://img.shields.io/badge/SQL_Comments-0-64748b?style=flat-square)

### HCL

![HCL Files](https://img.shields.io/badge/HCL_Files-0-844fba?style=flat-square)
![HCL Lines](https://img.shields.io/badge/HCL_Lines-0-a78bfa?style=flat-square)
![HCL Blocks](https://img.shields.io/badge/HCL_Blocks-0-7c3aed?style=flat-square)
![HCL Resources](https://img.shields.io/badge/HCL_Resources-0-0284c7?style=flat-square)
![HCL Variables](https://img.shields.io/badge/HCL_Variables-0-16a34a?style=flat-square)
![HCL Outputs](https://img.shields.io/badge/HCL_Outputs-0-059669?style=flat-square)
![HCL Attributes](https://img.shields.io/badge/HCL_Attributes-0-0ea5e9?style=flat-square)
![HCL Interpolations](https://img.shields.io/badge/HCL_Interpolations-0-db2777?style=flat-square)
![HCL Comments](https://img.shields.io/badge/HCL_Comments-0-64748b?style=flat-square)

### CSS

![CSS Files](https://img.shields.io/badge/CSS_Files-0-264de4?style=flat-square)
![CSS Lines](https://img.shields.io/badge/CSS_Lines-0-2965f1?style=flat-square)
![CSS Rules](https://img.shields.io/badge/CSS_Rules-0-7c3aed?style=flat-square)
![CSS Selectors](https://img.shields.io/badge/CSS_Selectors-0-8b5cf6?style=flat-square)
![CSS Declarations](https://img.shields.io/badge/CSS_Declarations-0-0284c7?style=flat-square)
![CSS At Rules](https://img.shields.io/badge/CSS_At_Rules-0-f97316?style=flat-square)
![CSS Media Queries](https://img.shields.io/badge/CSS_Media_Queries-0-ea580c?style=flat-square)
![CSS Custom Properties](https://img.shields.io/badge/CSS_Custom_Properties-0-16a34a?style=flat-square)
![CSS Comments](https://img.shields.io/badge/CSS_Comments-0-64748b?style=flat-square)

### Conventions

![Module Files](https://img.shields.io/badge/Module_Files-4-7c3aed?style=flat-square)
![Service Files](https://img.shields.io/badge/Service_Files-2-0284c7?style=flat-square)
![Command Files](https://img.shields.io/badge/Command_Files-0-16a34a?style=flat-square)
![Constants Files](https://img.shields.io/badge/Constants_Files-3-ea580c?style=flat-square)
![Types Files](https://img.shields.io/badge/Types_Files-3-db2777?style=flat-square)
![Utilities Files](https://img.shields.io/badge/Utilities_Files-3-0ea5e9?style=flat-square)
![TypeORM Entities](https://img.shields.io/badge/TypeORM_Entities-6-059669?style=flat-square)
![Unit Tests](https://img.shields.io/badge/Unit_Tests-2-ca8a04?style=flat-square)
![Integration Tests](https://img.shields.io/badge/Integration_Tests-3-7c3aed?style=flat-square)
![End To End Tests](https://img.shields.io/badge/End_To_End_Tests-0-0284c7?style=flat-square)
![CSS Comment Budget](https://img.shields.io/badge/CSS_Comment_Budget-0-16a34a?style=flat-square)
![HCL Comment Budget](https://img.shields.io/badge/HCL_Comment_Budget-0-ea580c?style=flat-square)
![Python Comment Budget](https://img.shields.io/badge/Python_Comment_Budget-0-db2777?style=flat-square)
![SQL Comment Budget](https://img.shields.io/badge/SQL_Comment_Budget-0-0ea5e9?style=flat-square)
![TOML Comment Budget](https://img.shields.io/badge/TOML_Comment_Budget-0-059669?style=flat-square)
![TypeScript Comment Budget](https://img.shields.io/badge/TypeScript_Comment_Budget-0-ca8a04?style=flat-square)
![YAML Comment Budget](https://img.shields.io/badge/YAML_Comment_Budget-0-7c3aed?style=flat-square)
![Shell Comment Budget](https://img.shields.io/badge/Shell_Comment_Budget-0-0284c7?style=flat-square)

### Jupyter

![Notebooks](https://img.shields.io/badge/Notebooks-0-f37626?style=flat-square)
![Notebook Cells](https://img.shields.io/badge/Notebook_Cells-0-e8a33d?style=flat-square)
![Code Cells](https://img.shields.io/badge/Code_Cells-0-3776ab?style=flat-square)
![Markdown Cells](https://img.shields.io/badge/Markdown_Cells-0-083fa1?style=flat-square)
![Raw Cells](https://img.shields.io/badge/Raw_Cells-0-9ca3af?style=flat-square)
![Executed Cells](https://img.shields.io/badge/Executed_Cells-0-16a34a?style=flat-square)
![Cell Outputs](https://img.shields.io/badge/Cell_Outputs-0-059669?style=flat-square)
![Notebook Code Lines](https://img.shields.io/badge/Notebook_Code_Lines-0-4b8bbe?style=flat-square)
![Notebook Classes](https://img.shields.io/badge/Notebook_Classes-0-7c3aed?style=flat-square)
![Notebook Functions](https://img.shields.io/badge/Notebook_Functions-0-22c55e?style=flat-square)
![Notebook Imports](https://img.shields.io/badge/Notebook_Imports-0-0284c7?style=flat-square)
![Notebook Decorators](https://img.shields.io/badge/Notebook_Decorators-0-db2777?style=flat-square)
![Notebook Prose Lines](https://img.shields.io/badge/Notebook_Prose_Lines-0-1f6feb?style=flat-square)
![Notebook Headings](https://img.shields.io/badge/Notebook_Headings-0-a78bfa?style=flat-square)
![Notebook Links](https://img.shields.io/badge/Notebook_Links-0-10b981?style=flat-square)
![Notebook Images](https://img.shields.io/badge/Notebook_Images-0-34d399?style=flat-square)
![Notebook Code Blocks](https://img.shields.io/badge/Notebook_Code_Blocks-0-dc2626?style=flat-square)
![Notebook Properties](https://img.shields.io/badge/Notebook_Properties-0-ca8a04?style=flat-square)
![Notebook Nodes](https://img.shields.io/badge/Notebook_Nodes-0-a16207?style=flat-square)
![Notebook Max Depth](https://img.shields.io/badge/Notebook_Max_Depth-0-ea580c?style=flat-square)

### Markdown

![Markdown Files](https://img.shields.io/badge/Markdown_Files-1-083fa1?style=flat-square)
![Markdown Lines](https://img.shields.io/badge/Markdown_Lines-77-1f6feb?style=flat-square)
![H1](https://img.shields.io/badge/H1-1-7c3aed?style=flat-square)
![H2](https://img.shields.io/badge/H2-3-8b5cf6?style=flat-square)
![H3](https://img.shields.io/badge/H3-4-a78bfa?style=flat-square)
![H4](https://img.shields.io/badge/H4-0-c4b5fd?style=flat-square)
![H5](https://img.shields.io/badge/H5-0-ddd6fe?style=flat-square)
![H6](https://img.shields.io/badge/H6-0-ede9fe?style=flat-square)
![Paragraphs](https://img.shields.io/badge/Paragraphs-14-64748b?style=flat-square)
![Lists](https://img.shields.io/badge/Lists-2-16a34a?style=flat-square)
![List Items](https://img.shields.io/badge/List_Items-10-22c55e?style=flat-square)
![Task List Items](https://img.shields.io/badge/Task_List_Items-0-4ade80?style=flat-square)
![Tables](https://img.shields.io/badge/Tables-0-0284c7?style=flat-square)
![Table Rows](https://img.shields.io/badge/Table_Rows-0-0ea5e9?style=flat-square)
![Links](https://img.shields.io/badge/Links-3-059669?style=flat-square)
![Images](https://img.shields.io/badge/Images-0-10b981?style=flat-square)
![Code Blocks](https://img.shields.io/badge/Code_Blocks-2-dc2626?style=flat-square)
![Inline Code](https://img.shields.io/badge/Inline_Code-18-ef4444?style=flat-square)
![Block Quotes](https://img.shields.io/badge/Block_Quotes-0-ca8a04?style=flat-square)
![Thematic Breaks](https://img.shields.io/badge/Thematic_Breaks-0-a16207?style=flat-square)
<!-- codometer:end -->
