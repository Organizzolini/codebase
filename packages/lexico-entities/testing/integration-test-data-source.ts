import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { DataSource, type DataSourceOptions } from "typeorm";

import {
  LEXICO_DATABASE_ENTITIES,
  lexicoDataSource,
} from "../src/modules/lexico-database/data-source.constants";

/** Represents the integration database resources needed by test suites. */
export interface IntegrationTestDatabaseResources {
  readonly dataSource: DataSource;
  readonly stop: () => Promise<void>;
}

/** Defines PostgreSQL connection details used for integration tests. */
interface IntegrationPostgresConnectionOptions {
  readonly databaseName: string;
  readonly images: readonly string[];
  readonly password: string;
  readonly username: string;
}

const DEFAULT_INTEGRATION_POSTGRES_IMAGES = [
  "postgres:18-alpine",
  "mirror.gcr.io/library/postgres:18-alpine",
] as const;

/** Narrows DataSourceOptions to a postgres-only option shape. */
type PostgresDataSourceOptions = Extract<
  DataSourceOptions,
  { type: "postgres" }
>;

/** Creates and initializes an ephemeral PostgreSQL-backed integration DataSource. */
export async function createIntegrationTestDatabaseResources(): Promise<IntegrationTestDatabaseResources> {
  const connectionOptions = getIntegrationPostgresConnectionOptions();
  const baseDataSourceOptions = lexicoDataSource.options;

  if (baseDataSourceOptions.type !== "postgres") {
    throw new Error(
      "Integration test DataSource must be created from postgres options.",
    );
  }

  const postgresBaseDataSourceOptions: PostgresDataSourceOptions =
    baseDataSourceOptions;

  assertSafeIntegrationDatabaseConfiguration(connectionOptions);

  const postgresContainer: StartedPostgreSqlContainer =
    await startPostgresContainer(connectionOptions);

  const dataSourceOptions: PostgresDataSourceOptions = {
    ...postgresBaseDataSourceOptions,
    database: postgresContainer.getDatabase(),
    entities: [...LEXICO_DATABASE_ENTITIES],
    host: postgresContainer.getHost(),
    logging: false,
    migrations: [],
    password: postgresContainer.getPassword(),
    port: postgresContainer.getPort(),
    // 🎯 Synchronizes into the container's default schema until this harness
    // gives way to the shared one, which migrates into `lexico`.
    schema: "public",
    subscribers: [],
    synchronize: false,
    username: postgresContainer.getUsername(),
  };

  const dataSource = new DataSource(dataSourceOptions);

  try {
    await dataSource.initialize();
    await dataSource.synchronize();
  } catch (error) {
    await postgresContainer.stop();
    throw error;
  }

  return {
    dataSource,
    stop: async (): Promise<void> => {
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }

      await postgresContainer.stop();
    },
  };
}

/** Guards against unsafe integration database execution contexts. */
function assertSafeIntegrationDatabaseConfiguration(
  connectionOptions: IntegrationPostgresConnectionOptions,
): void {
  if (process.env["NODE_ENV"] === "production") {
    throw new Error(
      "Refusing to run lexico-entities integration tests in production mode.",
    );
  }

  if (
    connectionOptions.databaseName === "postgres" ||
    connectionOptions.databaseName === "template0" ||
    connectionOptions.databaseName === "template1"
  ) {
    throw new Error(
      `Unsafe integration test database '${connectionOptions.databaseName}'. Configure LEXICO_ENTITIES_TEST_POSTGRES_DB.`,
    );
  }
}

/** Resolves integration connection values from dedicated or fallback env vars. */
function getIntegrationPostgresConnectionOptions(): IntegrationPostgresConnectionOptions {
  const databaseName =
    process.env["LEXICO_ENTITIES_TEST_POSTGRES_DB"] ?? "lexico_entities_test";
  const configuredImage = process.env["LEXICO_ENTITIES_TEST_POSTGRES_IMAGE"];
  const images =
    configuredImage === undefined
      ? [...DEFAULT_INTEGRATION_POSTGRES_IMAGES]
      : [configuredImage];
  const password =
    process.env["LEXICO_ENTITIES_TEST_POSTGRES_PASSWORD"] ??
    process.env["POSTGRES_PASSWORD"] ??
    "postgres";
  const username =
    process.env["LEXICO_ENTITIES_TEST_POSTGRES_USER"] ??
    process.env["POSTGRES_USER"] ??
    "postgres";

  return {
    databaseName,
    images,
    password,
    username,
  };
}

/**
 * Starts a PostgreSQL test container by trying configured image candidates.
 */
async function startPostgresContainer(
  connectionOptions: IntegrationPostgresConnectionOptions,
): Promise<StartedPostgreSqlContainer> {
  let latestError: unknown;

  for (const image of connectionOptions.images) {
    try {
      return await new PostgreSqlContainer(image)
        .withDatabase(connectionOptions.databaseName)
        .withUsername(connectionOptions.username)
        .withPassword(connectionOptions.password)
        .start();
    } catch (error) {
      latestError = error;
    }
  }

  throw new Error(
    `Unable to start PostgreSQL test container. Tried images: ${connectionOptions.images.join(", ")}. Last error: ${toErrorMessage(latestError)}`,
  );
}

/**
 * Normalizes unknown error values into a human-readable message string.
 */
function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
