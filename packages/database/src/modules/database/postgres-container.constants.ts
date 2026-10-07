// ♟️ Constants

/**
 * The images a test container is started from, in order: Docker Hub first,
 * then Google's mirror of it, so a Docker Hub rate limit does not fail a run.
 * Postgres 18 is the first release with the native `uuidv7()` every
 * `IdentifiableEntity` id defaults to.
 */
export const POSTGRES_CONTAINER_IMAGES = [
  "postgres:18-alpine",
  "mirror.gcr.io/library/postgres:18-alpine",
] as const;

/** Where the official image runs scripts from on its first start. */
export const POSTGRES_CONTAINER_INITIALIZATION_PATH =
  "/docker-entrypoint-initdb.d/project.sql";
