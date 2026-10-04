// 🏷️ Types

import type { DatabaseModuleOptions } from "../src/modules/database/database.types";
import type {
  PostgresContainerOptions,
  StartedPostgresContainer,
} from "../src/modules/database/postgres-container.types";
import type { ModuleMetadata } from "@nestjs/common";
import type { TestingModule } from "@nestjs/testing";
import type { TypeOrmModule } from "@nestjs/typeorm";
import type {
  DataSource,
  EntityTarget,
  ObjectLiteral,
  Repository,
} from "typeorm";

/**
 * How the testing module connects: through the project's own database
 * module, or through the helper's own `DatabaseModule.forRoot`, which alone
 * takes a naming strategy.
 */
export type DatabaseTestingConnection =
  | {
      /**
       * The project's own database module, imported in place of the
       * helper's own `DatabaseModule.forRoot`, so modules under test that
       * import it share its one connection rather than opening a second.
       */
      readonly database: NonNullable<ModuleMetadata["imports"]>[number];

      /** Set on the project's own module instead. */
      readonly namingStrategy?: never;
    }
  | {
      /** Absent: the helper connects with its own `DatabaseModule.forRoot`. */
      readonly database?: never;

      /** Replaces snake case on the helper's own `DatabaseModule.forRoot`. */
      readonly namingStrategy?: DatabaseModuleOptions["namingStrategy"];
    };

/** A testing module connected to a migrated throwaway database. */
export interface DatabaseTestingModule {
  /** Closes the module, stops the container, and restores the environment. */
  readonly close: () => Promise<void>;

  /** The running container; `close` stops it. */
  readonly container: StartedPostgresContainer;

  /** The module's connection, as the project's role. */
  readonly dataSource: DataSource;

  /** The compiled testing module. */
  readonly module: TestingModule;

  /** The repository for `entity` on the module's connection. */
  readonly repository: <Entity extends ObjectLiteral>(
    entity: EntityTarget<Entity>,
  ) => Repository<Entity>;
}

/** What `startDatabaseTestingModule` is given. */
export type DatabaseTestingModuleOptions = DatabaseTestingConnection &
  DatabaseTestingModuleSettings;

/** Every option but how the testing module connects. */
export interface DatabaseTestingModuleSettings
  extends
    Omit<DatabaseModuleOptions, "entities" | "namingStrategy">,
    PostgresContainerOptions {
  /**
   * The entity classes to register repositories for, and to connect when no
   * `database` module is given.
   */
  readonly entities: NonNullable<
    Parameters<typeof TypeOrmModule.forFeature>[0]
  >;

  /** The modules under test, beside the database and configuration. */
  readonly imports?: ModuleMetadata["imports"];

  /** The providers under test. */
  readonly providers?: ModuleMetadata["providers"];

  /**
   * Validates the environment the way the application does, usually its
   * own `environmentSchema.parse`; every variable is otherwise read raw.
   */
  readonly validate?: (
    config: Record<string, unknown>,
  ) => Record<string, unknown>;
}
