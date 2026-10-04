import { meanderDataSourceOptions } from "../src/modules/database/database.factories";

import type { TypeOrmModuleOptions } from "@nestjs/typeorm";

/**
 * Points the production connection at a throwaway Postgres container, for the
 * integration suites that persist real rows.
 *
 * Each suite starts its own container rather than this folder starting one:
 * `@testcontainers/postgresql` is a development dependency, which the build
 * dependency check forbids here because these harnesses are not
 * `*.test.ts` themselves. So a suite starts
 * `new PostgreSqlContainer(TEST_POSTGRES_IMAGE)` with
 * {@link TEST_DATABASE_NAME} and {@link TEST_SCHEMA_INITIALIZATION} and hands the started container to
 * {@link testDataSourceOptions}.
 */

// 🔧 Configuration

/**
 * The database, and the schema inside it, every test container holds:
 * named apart from the `meanderaw_development` default so a suite never
 * passes by leaning on it.
 */
export const TEST_DATABASE_NAME = "meanderaw_test";

/** Postgres 18, the first release with the native `uuidv7()` every row's `id` defaults to. */
export const TEST_POSTGRES_IMAGE = "postgres:18-alpine";

/**
 * Creates the schema on the container's first start, as the local Docker
 * init does, since TypeORM's synchronize creates tables but never a schema.
 */
export const TEST_SCHEMA_INITIALIZATION = {
  content: `CREATE SCHEMA ${TEST_DATABASE_NAME};`,
  target: "/docker-entrypoint-initdb.d/schema.sql",
};

// 🏷️ Types

/** What a started test container answers with: declared here rather than imported, for the reason above. */
export interface TestDatabaseContainer {
  getDatabase(): string;
  getHost(): string;
  getPassword(): string;
  getPort(): number;
  getUsername(): string;
}

// 🌎 Utilities

/**
 * The production connection options aimed at `container`, dropping every
 * table first so each connection starts from an empty schema.
 */
export function testDataSourceOptions(
  container: TestDatabaseContainer,
): TypeOrmModuleOptions {
  return {
    ...meanderDataSourceOptions({
      database: container.getDatabase(),
      host: container.getHost(),
      password: container.getPassword(),
      port: container.getPort(),
      schema: TEST_DATABASE_NAME,
      username: container.getUsername(),
    }),
    dropSchema: true,
  };
}
