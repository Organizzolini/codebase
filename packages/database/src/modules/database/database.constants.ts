// ♟️ Constants

/**
 * The six variables every database-backed project reads, each named
 * `<PROJECT>_<SUFFIX>` and keyed by the connection field it fills. The
 * prefix is what keeps the root's unprefixed `POSTGRES_*`, the shared
 * container's admin login, from ever reaching an application: Nx loads the
 * root `.env` into every task.
 */
export const POSTGRES_ENVIRONMENT_SUFFIXES = {
  database: "POSTGRES_DATABASE",
  host: "POSTGRES_HOST",
  password: "POSTGRES_PASSWORD",
  port: "POSTGRES_PORT",
  schema: "POSTGRES_SCHEMA",
  username: "POSTGRES_USERNAME",
} as const;

/** Every connection field, in the order the variables are listed. */
export const POSTGRES_CONNECTION_FIELDS = [
  "database",
  "host",
  "password",
  "port",
  "schema",
  "username",
] as const satisfies readonly (keyof typeof POSTGRES_ENVIRONMENT_SUFFIXES)[];

/** Where the shared local Docker Postgres listens. */
export const DEFAULT_POSTGRES_HOST = "localhost";

/** The port the shared local Docker Postgres publishes. */
export const DEFAULT_POSTGRES_PORT = 5432;

/**
 * What a project's name may be: lowercase letters, digits, and underscores,
 * starting with a letter, so it can prefix an environment variable and name
 * a database, a schema, and a role without quoting.
 */
export const PROJECT_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;
