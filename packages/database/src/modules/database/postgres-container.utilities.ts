import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { DataSource } from "typeorm";

import {
  postgresConnection,
  postgresDataSourceOptions,
  postgresEnvironment,
} from "./database.utilities";
import {
  POSTGRES_CONTAINER_IMAGES,
  POSTGRES_CONTAINER_INITIALIZATION_PATH,
} from "./postgres-container.constants";

import type { PostgresConnection } from "./database.types";
import type {
  PostgresContainerOptions,
  StartedPostgresContainer,
} from "./postgres-container.types";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";

// 🏭 Factories

/**
 * Starts a throwaway Postgres 18 laid out the way the local Docker one is —
 * a `<project>_username` role owning a `<project>_testing` database with a
 * `<project>` schema inside it — and builds the schema by running the
 * project's real migrations, so every integration suite exercises them.
 *
 * Resolves with the role's connection, never the container's admin login,
 * plus the same connection as `<PROJECT>_POSTGRES_*` variables for a
 * `DatabaseModule` to read.
 */
export async function startPostgresContainer({
  images = POSTGRES_CONTAINER_IMAGES,
  migrations,
  project,
}: PostgresContainerOptions): Promise<StartedPostgresContainer> {
  const layout = postgresConnection({
    environment: {},
    project,
  });
  const database = `${project}_testing`;
  const container = await startFirstAvailableImage(images, {
    ...layout,
    database,
  });
  const connection: PostgresConnection = {
    ...layout,
    database,
    host: container.getHost(),
    port: container.getPort(),
  };

  try {
    await runMigrations(connection, migrations);
  } catch (error) {
    await container.stop();
    throw error;
  }

  return {
    connection,
    environment: postgresEnvironment({ connection, project }),
    stop: async (): Promise<void> => {
      await container.stop();
    },
  };
}

/**
 * The SQL the official image runs on its first start, as its superuser:
 * the same role, database, and schema the local Docker init creates, named
 * for testing. Every name is checked by {@link postgresConnection} first,
 * so none needs quoting.
 */
function postgresInitializationSql(connection: PostgresConnection): string {
  return [
    `CREATE ROLE ${connection.username} LOGIN PASSWORD '${connection.password}';`,
    `CREATE DATABASE ${connection.database} OWNER ${connection.username};`,
    String.raw`\connect ${connection.database}`,
    `CREATE SCHEMA ${connection.schema} AUTHORIZATION ${connection.username};`,
    "",
  ].join("\n");
}

/** Runs every migration as the project's role, then disconnects. */
async function runMigrations(
  connection: PostgresConnection,
  migrations: PostgresContainerOptions["migrations"],
): Promise<void> {
  const dataSource = new DataSource(
    postgresDataSourceOptions(connection, { entities: [], migrations }),
  );

  await dataSource.initialize();

  try {
    await dataSource.runMigrations({ transaction: "each" });
  } finally {
    await dataSource.destroy();
  }
}

/**
 * Starts the first image that will start, initialized with `layout`'s role,
 * database, and schema, so a Docker Hub rate limit falls through to the
 * mirror rather than failing the suite.
 */
async function startFirstAvailableImage(
  images: readonly string[],
  layout: PostgresConnection,
): Promise<StartedPostgreSqlContainer> {
  const initializationSql = postgresInitializationSql(layout);
  const failures: string[] = [];

  for (const image of images) {
    try {
      return await new PostgreSqlContainer(image)
        .withCopyContentToContainer([
          {
            content: initializationSql,
            target: POSTGRES_CONTAINER_INITIALIZATION_PATH,
          },
        ])
        .start();
    } catch (error) {
      failures.push(`${image}: ${String(error)}`);
    }
  }

  throw new Error(
    `Unable to start a Postgres test container. ${failures.join("; ")}`,
  );
}
