import { DataSource } from "typeorm";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";
import { z } from "zod";

import {
  DEFAULT_POSTGRES_HOST,
  DEFAULT_POSTGRES_PORT,
  POSTGRES_CONNECTION_FIELDS,
  POSTGRES_ENVIRONMENT_SUFFIXES,
  PROJECT_NAME_PATTERN,
} from "./database.constants";

import type {
  DatabaseOptions,
  PostgresConnection,
  PostgresConnectionSource,
  PostgresDataSourceOptions,
  PostgresDataSourceSettings,
  PostgresEnvironmentShape,
  PostgresProject,
  PostgresSettingsShape,
} from "./database.types";

// 🌎 Utilities

/**
 * The `DataSource` a project's TypeORM command-line entry exports, built from
 * the same options as `DatabaseModule.forRoot` so a generated migration
 * matches what the application expects. It reads only the project's
 * `<PROJECT>_POSTGRES_*` variables, from `process.env` unless given others:
 *
 * ```ts
 * // src/modules/database/data-source.constants.ts
 * export default createDataSource({
 *   entities: [Meander],
 *   migrations: ["src/modules/database/migrations/*.ts"],
 *   project: "meanderaw",
 * });
 * ```
 */
export function createDataSource(
  { project, ...settings }: DatabaseOptions,
  environment: Readonly<Record<string, unknown>> = process.env,
): DataSource {
  return new DataSource(
    postgresDataSourceOptions(
      postgresConnection({ environment, project }),
      settings,
    ),
  );
}

/**
 * The connection a project's prefixed variables describe, defaulted the way
 * {@link postgresEnvironmentSchema} defaults them. Unprefixed variables are
 * never read.
 */
export function postgresConnection({
  environment,
  project,
}: PostgresConnectionSource): PostgresConnection {
  const prefix = postgresEnvironmentPrefix(project);

  return postgresSettingsSchema(project).parse(
    Object.fromEntries(
      Object.entries(POSTGRES_ENVIRONMENT_SUFFIXES).map(([field, suffix]) => [
        field,
        environment[`${prefix}${suffix}`],
      ]),
    ),
  );
}

/**
 * The TypeORM options for `connection`, shared by every runtime module and
 * command-line data source so a generated migration matches what the
 * application expects.
 *
 * `synchronize` and `migrationsRun` are hard-coded off and cannot be passed
 * in: the schema changes only through reviewed migrations, run by
 * `nx run <project>:migration:run` rather than on start, where several
 * processes starting together would race on the same DDL. The schema is set
 * on the connection rather than on any entity, so it comes from
 * configuration rather than code. Snake case unless another strategy is
 * given, so a raw SQL reader never quotes a column.
 */
export function postgresDataSourceOptions(
  connection: PostgresConnection,
  { entities, migrations, namingStrategy }: PostgresDataSourceSettings,
): PostgresDataSourceOptions {
  return {
    database: connection.database,
    entities,
    host: connection.host,
    logging: false,
    migrations,
    migrationsRun: false,
    namingStrategy: namingStrategy ?? new SnakeNamingStrategy(),
    password: connection.password,
    port: connection.port,
    schema: connection.schema,
    synchronize: false,
    type: "postgres",
    username: connection.username,
  };
}

/** The `<PROJECT>_POSTGRES_*` variable names a project reads. */
export function postgresEnvironmentKeys(project: string): string[] {
  const prefix = postgresEnvironmentPrefix(project);

  return Object.values(POSTGRES_ENVIRONMENT_SUFFIXES).map(
    (suffix) => `${prefix}${suffix}`,
  );
}

/**
 * The zod fragment for a project's `<PROJECT>_POSTGRES_*` variables, which
 * each application spreads into its own environment schema:
 *
 * ```ts
 * z.object({ ...postgresEnvironmentSchema({ project: "lexico" }), ... })
 * ```
 *
 * Throws when the name could not prefix a variable or name a database.
 */
export function postgresEnvironmentSchema<Project extends string>({
  project,
}: PostgresProject<Project>): PostgresEnvironmentShape<Project> {
  const prefix = postgresEnvironmentPrefix(project);
  const settings = postgresSettingsSchema(project).shape;
  const shape = Object.fromEntries(
    POSTGRES_CONNECTION_FIELDS.map((field) => [
      `${prefix}${POSTGRES_ENVIRONMENT_SUFFIXES[field]}`,
      settings[field],
    ]),
  );

  if (!isPostgresEnvironmentShape(shape, project)) {
    throw new Error(`Incomplete Postgres environment for '${project}'.`);
  }

  return shape;
}

/**
 * The project's six connection fields, each defaulted from the project's
 * name: database `<project>_development`, schema `<project>`, role
 * `<project>_username` with password `<project>_password`, and the shared
 * container on `localhost:5432`.
 */
export function postgresSettingsSchema(
  project: string,
): z.ZodObject<PostgresSettingsShape> {
  return z.object({
    database: z.string().min(1).default(`${project}_development`),
    host: z.string().min(1).default(DEFAULT_POSTGRES_HOST),
    password: z.string().default(`${project}_password`),
    port: z.coerce.number().int().positive().default(DEFAULT_POSTGRES_PORT),
    schema: z.string().min(1).default(project),
    username: z.string().min(1).default(`${project}_username`),
  });
}

/**
 * Whether `shape` holds a schema under every one of the project's variable
 * names: what lets the computed keys keep their literal types.
 */
function isPostgresEnvironmentShape<Project extends string>(
  shape: Readonly<Record<string, unknown>>,
  project: Project,
): shape is PostgresEnvironmentShape<Project> {
  return postgresEnvironmentKeys(project).every((key) => key in shape);
}

/** `LEXICO_` for `lexico`, after checking the name can carry one. */
function postgresEnvironmentPrefix(project: string): string {
  if (!PROJECT_NAME_PATTERN.test(project)) {
    throw new Error(
      `Project name '${project}' must match ${String(PROJECT_NAME_PATTERN)} to name its Postgres variables, database, schema, and role.`,
    );
  }

  return `${project.toUpperCase()}_`;
}
