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
  PostgresConnectionField,
  PostgresConnectionSource,
  PostgresDataSourceOptions,
  PostgresDataSourceSettings,
  PostgresEnvironmentShape,
  PostgresEnvironmentSource,
  PostgresProject,
  PostgresSettingsShape,
} from "./database.types";

// 🌎 Utilities

/**
 * Holds `shape` to having a key for every one of `project`'s
 * `<PROJECT>_POSTGRES_*` variables, which is what types
 * {@link postgresEnvironmentSchema}'s computed keys from the project's name.
 * It checks the keys alone, never the schema under each, and throws, naming
 * each missing variable, when one is absent.
 */
export function assertPostgresEnvironmentKeys<Project extends string>(
  shape: Readonly<Record<string, z.ZodType>>,
  project: Project,
): asserts shape is PostgresEnvironmentShape<Project> {
  const missing: string[] = [];

  for (const key of postgresEnvironmentKeys(project)) {
    if (!(key in shape)) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `The Postgres environment schema for '${project}' lacks ${missing.join(", ")}.`,
    );
  }
}

/**
 * The `DataSource` a project's TypeORM command-line entry exports, built from
 * the same options as `DatabaseModule.forRoot` so a generated migration
 * matches what the application expects. It reads only the project's
 * `<PROJECT>_POSTGRES_*` variables, from `process.env` unless given others:
 *
 * ```ts
 * // src/modules/meanderaw-database/data-source.constants.ts
 * export const meanderawDataSource = createDataSource({
 *   entities: [Meander],
 *   migrations: ["src/modules/meanderaw-database/migrations/*.ts"],
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
 * `postgresEnvironmentSchema` defaults them. Unprefixed variables are never
 * read.
 */
export function postgresConnection({
  environment,
  project,
}: PostgresConnectionSource): PostgresConnection {
  const settings: Record<string, unknown> = {};

  for (const field of POSTGRES_CONNECTION_FIELDS) {
    settings[field] = environment[postgresEnvironmentKey(project, field)];
  }

  return postgresSettingsSchema(project).parse(settings);
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
 * configuration rather than code, and pinned as every session's search
 * path, so unqualified SQL and TypeORM's `current_schema()` fallback both
 * land in it rather than in `public`. Snake case unless another strategy is
 * given, so a raw SQL reader never quotes a column.
 *
 * Throws when the schema could not be named unquoted.
 */
export function postgresDataSourceOptions(
  connection: PostgresConnection,
  { entities, migrations, namingStrategy }: PostgresDataSourceSettings,
): PostgresDataSourceOptions {
  return {
    database: connection.database,
    entities,
    extra: { options: postgresSearchPathOption(connection.schema) },
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

/**
 * `connection` as the project's `<PROJECT>_POSTGRES_*` variables: what to
 * stub into the environment for a `DatabaseModule` to read it back.
 */
export function postgresEnvironment({
  connection,
  project,
}: PostgresEnvironmentSource): Record<string, string> {
  const environment: Record<string, string> = {};

  for (const field of POSTGRES_CONNECTION_FIELDS) {
    environment[postgresEnvironmentKey(project, field)] = String(
      connection[field],
    );
  }

  return environment;
}

/**
 * The variable a project reads `field` from, for example
 * `LEXICO_POSTGRES_DATABASE` for lexico's `database`. Throws when the name
 * could not prefix a variable or name a database, schema, or role unquoted.
 */
export function postgresEnvironmentKey(
  project: string,
  field: PostgresConnectionField,
): string {
  if (!PROJECT_NAME_PATTERN.test(project)) {
    throw new Error(
      `Project name '${project}' must match ${String(PROJECT_NAME_PATTERN)} to name its Postgres variables, database, schema, and role.`,
    );
  }

  return `${project.toUpperCase()}_${POSTGRES_ENVIRONMENT_SUFFIXES[field]}`;
}

/** The `<PROJECT>_POSTGRES_*` variable names a project reads. */
export function postgresEnvironmentKeys(project: string): string[] {
  const keys: string[] = [];

  for (const field of POSTGRES_CONNECTION_FIELDS) {
    keys.push(postgresEnvironmentKey(project, field));
  }

  return keys;
}

/**
 * The zod fragment for a project's `<PROJECT>_POSTGRES_*` variables, which
 * each application spreads into its own environment schema:
 *
 * ```ts
 * z.object({ ...postgresEnvironmentSchema({ project: "lexico" }), ... })
 * ```
 *
 * Its keys are typed from the project's name, which computed keys cannot
 * carry on their own, so {@link assertPostgresEnvironmentKeys} checks the
 * one key per connection field it builds.
 *
 * Throws when the name could not prefix a variable or name a database.
 */
export function postgresEnvironmentSchema<Project extends string>({
  project,
}: PostgresProject<Project>): PostgresEnvironmentShape<Project> {
  const settings = postgresSettingsSchema(project).shape;
  const shape: Record<string, z.ZodType> = {};

  for (const field of POSTGRES_CONNECTION_FIELDS) {
    shape[postgresEnvironmentKey(project, field)] = settings[field];
  }

  assertPostgresEnvironmentKeys(shape, project);

  return shape;
}

/**
 * The startup parameter pg sends as `options` on each pooled connection,
 * setting the session's `search_path` to `schema` alone.
 *
 * `public` is left off on purpose: no project relies on anything in it.
 * `to_tsvector`, `plainto_tsquery`, and the `english` configuration live in
 * `pg_catalog`, which Postgres always searches first; `uuidv7()` is built
 * into Postgres 18; and no migration creates an extension. Kept on, it would
 * let unqualified DDL fall through into `public` whenever the project schema
 * is missing, where now that DDL fails. An extension a project later needs
 * belongs in its own schema.
 *
 * Throws when `schema` could not be named unquoted, which also keeps it from
 * smuggling a second schema or setting into the parameter.
 */
export function postgresSearchPathOption(schema: string): string {
  if (!PROJECT_NAME_PATTERN.test(schema)) {
    throw new Error(
      `Schema '${schema}' must match ${String(PROJECT_NAME_PATTERN)} to be set as the search path unquoted.`,
    );
  }

  return `-c search_path=${schema}`;
}

/**
 * The project's six connection fields, each defaulted from the project's
 * name: database `<project>_development`, schema `<project>`, role
 * `<project>_username` with password `<project>_password`, and the shared
 * container on `localhost:5432`. A set schema must match the project-name
 * pattern, so a bad `<PROJECT>_POSTGRES_SCHEMA` fails here, by name, rather
 * than when the search path is built.
 */
export function postgresSettingsSchema(
  project: string,
): z.ZodObject<PostgresSettingsShape> {
  return z.object({
    database: z.string().min(1).default(`${project}_development`),
    host: z.string().min(1).default(DEFAULT_POSTGRES_HOST),
    password: z.string().default(`${project}_password`),
    port: z.coerce.number().int().positive().default(DEFAULT_POSTGRES_PORT),
    schema: z.string().regex(PROJECT_NAME_PATTERN).default(project),
    username: z.string().min(1).default(`${project}_username`),
  });
}
