// 🏷️ Types

import type {
  PostgresConnection,
  PostgresDataSourceSettings,
} from "./database.types";

/** What `startPostgresContainer` is given. */
export interface PostgresContainerOptions {
  /** Overrides the images tried, in order; mainly for a private mirror. */
  readonly images?: readonly string[];

  /** The project's real migrations, which build its schema. */
  readonly migrations: PostgresDataSourceSettings["migrations"];

  /** Names the `<project>_testing` database, the `<project>` schema, and the `<project>_username` role. */
  readonly project: string;
}

/** A running test container, migrated and ready to connect to. */
export interface StartedPostgresContainer {
  /** The project's own connection: its role, its `_testing` database, and its schema. */
  readonly connection: PostgresConnection;

  /**
   * The same connection as the project's `<PROJECT>_POSTGRES_*` variables,
   * for stubbing into the environment a `DatabaseModule` reads.
   */
  readonly environment: Readonly<Record<string, string>>;

  /** Stops and removes the container. */
  readonly stop: () => Promise<void>;
}
