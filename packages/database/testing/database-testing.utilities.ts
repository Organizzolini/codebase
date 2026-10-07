import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

import { DatabaseModule } from "../src/modules/database/database.module";
import { startPostgresContainer } from "../src/modules/database/postgres-container.utilities";

import type {
  DatabaseTestingModule,
  DatabaseTestingModuleOptions,
} from "./database-testing.types";
import type { TestingModule } from "@nestjs/testing";
import type { EntityTarget, ObjectLiteral, Repository } from "typeorm";

// 🌎 Utilities

/**
 * Starts a migrated throwaway Postgres for `project` with
 * {@link startPostgresContainer}, then compiles a Nest testing module
 * connected to it the way the application connects: through
 * `DatabaseModule.forRoot`, reading the container's
 * `<PROJECT>_POSTGRES_*` variables from a global `ConfigModule`.
 *
 * ```ts
 * const database = await startDatabaseTestingModule({
 *   entities: [Meander],
 *   imports: [DrawingModule],
 *   migrations: [Migration1791160950069],
 *   project: "meanderaw",
 * });
 * const meanders = database.repository(Meander);
 * // …
 * await database.close();
 * ```
 *
 * The variables are set on `process.env` for the module's lifetime, over
 * any already there, and `close` puts the whole environment back as it was,
 * removing whatever `validate` filled in. When the modules
 * under test import the project's own database module, pass it as
 * `database`, so the testing module connects once, through it.
 */
export async function startDatabaseTestingModule({
  database,
  entities,
  imports = [],
  namingStrategy,
  providers = [],
  validate,
  ...containerOptions
}: DatabaseTestingModuleOptions): Promise<DatabaseTestingModule> {
  const { project } = containerOptions;
  const container = await startPostgresContainer(containerOptions);
  const restoreEnvironment = replaceEnvironment(container.environment);
  let module: TestingModule;
  let dataSource: DataSource;

  try {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          isGlobal: true,
          ...(validate === undefined ? {} : { validate }),
        }),
        database ??
          DatabaseModule.forRoot({
            entities,
            project,
            ...(namingStrategy === undefined ? {} : { namingStrategy }),
          }),
        TypeOrmModule.forFeature(entities),
        ...imports,
      ],
      providers,
    }).compile();
    dataSource = module.get(DataSource);
  } catch (error) {
    restoreEnvironment();
    await container.stop();
    throw error;
  }

  return {
    close: async (): Promise<void> => {
      try {
        await module.close();
      } finally {
        restoreEnvironment();
        await container.stop();
      }
    },
    container,
    dataSource,
    module,
    repository: <Entity extends ObjectLiteral>(
      entity: EntityTarget<Entity>,
    ): Repository<Entity> => dataSource.getRepository(entity),
  };
}

/**
 * Sets every one of `environment`'s variables on `process.env`, and returns
 * what puts the whole of `process.env` back as it was: every variable
 * restored, and every one added since removed, including the defaults
 * `ConfigModule` writes there when it validates.
 */
function replaceEnvironment(
  environment: Readonly<Record<string, string>>,
): () => void {
  const previous = { ...process.env };

  Object.assign(process.env, environment);

  return (): void => {
    for (const key of Object.keys(process.env)) {
      if (!(key in previous)) {
        Reflect.deleteProperty(process.env, key);
      }
    }

    Object.assign(process.env, previous);
  };
}
