// 🏷️ Types

import type { POSTGRES_ENVIRONMENT_SUFFIXES } from "./database.constants";
import type { DataSourceOptions, NamingStrategyInterface } from "typeorm";
import type { z } from "zod";

/** Where a project's database is, who to sign in as, and which schema holds its tables. */
export interface PostgresConnection {
  readonly database: string;
  readonly host: string;
  readonly password: string;
  readonly port: number;
  readonly schema: string;
  readonly username: string;
}

/** A connection field one of the six variables fills. */
export type PostgresConnectionField =
  keyof typeof POSTGRES_ENVIRONMENT_SUFFIXES;

/** The variables a connection is read from, set or not. */
export interface PostgresConnectionSource extends PostgresProject {
  readonly environment: Readonly<Record<string, unknown>>;
}

/** TypeORM's options for a Postgres connection. */
export type PostgresDataSourceOptions = Extract<
  DataSourceOptions,
  { type: "postgres" }
>;

/** What a project's code contributes to its connection: everything that is not an environment variable. */
export interface PostgresDataSourceSettings {
  readonly entities: NonNullable<PostgresDataSourceOptions["entities"]>;
  readonly migrations: NonNullable<PostgresDataSourceOptions["migrations"]>;

  /** Replaces snake case, as lexico's pluralizing strategy does. */
  readonly namingStrategy?: NamingStrategyInterface;
}

/** A project's own Postgres variable, for example `LEXICO_POSTGRES_DATABASE`. */
export type PostgresEnvironmentKey<Project extends string> =
  `${Uppercase<Project>}_${PostgresEnvironmentSuffix}`;

/**
 * The fragment `postgresEnvironmentSchema` returns: every field's schema,
 * keyed by the project's own variable name, ready to spread into
 * `z.object({ ... })`.
 */
export type PostgresEnvironmentShape<Project extends string> = {
  readonly [
    Field in PostgresConnectionField as `${Uppercase<Project>}_${(typeof POSTGRES_ENVIRONMENT_SUFFIXES)[Field]}`
  ]: PostgresSettingsShape[Field];
};

/** One of the six endings, for example `POSTGRES_DATABASE`. */
export type PostgresEnvironmentSuffix =
  (typeof POSTGRES_ENVIRONMENT_SUFFIXES)[PostgresConnectionField];

/** Names the project whose variables, database, schema, and role are meant. */
export interface PostgresProject<Project extends string = string> {
  readonly project: Project;
}

/** The zod schema each connection field is validated by. */
export type PostgresSettingsShape = Readonly<
  Record<"port", z.ZodDefault<z.ZodCoercedNumber>> &
    Record<Exclude<PostgresConnectionField, "port">, z.ZodDefault<z.ZodString>>
>;
