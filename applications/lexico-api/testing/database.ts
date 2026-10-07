import { vi } from "vitest";

import { startDatabaseTestingModule } from "@codebase/database/testing";
import {
  LEXICO_DATABASE_MIGRATIONS,
  LexicoDatabaseModule,
} from "@codebase/lexico-entities";

import { environmentSchema } from "../src/lexico-api.constants";

import type {
  DatabaseTestingModule,
  DatabaseTestingModuleOptions,
} from "@codebase/database/testing";

/** Starting Postgres and running every migration takes longer than a test. */
export const DATABASE_TIMEOUT_MILLISECONDS = 120_000;

/**
 * Starts a migrated `lexico_testing` database through the shared
 * `startDatabaseTestingModule`, connected the way the API connects: through
 * lexico's own `LexicoDatabaseModule`, from `LEXICO_POSTGRES_*` alone,
 * validated by the API's environment schema, while the root's unprefixed
 * admin login is present and ignored. `close` also removes that login.
 */
export async function startLexicoDatabaseTestingModule(
  entities: DatabaseTestingModuleOptions["entities"],
): Promise<DatabaseTestingModule> {
  vi.stubEnv("POSTGRES_DB", "postgres");
  vi.stubEnv("POSTGRES_PASSWORD", "postgres");
  vi.stubEnv("POSTGRES_USER", "postgres");

  try {
    const database = await startDatabaseTestingModule({
      database: LexicoDatabaseModule,
      entities,
      migrations: [...LEXICO_DATABASE_MIGRATIONS],
      project: "lexico",
      validate: (config) => environmentSchema.parse(config),
    });

    return {
      ...database,
      close: async (): Promise<void> => {
        try {
          await database.close();
        } finally {
          vi.unstubAllEnvs();
        }
      },
    };
  } catch (error) {
    vi.unstubAllEnvs();
    throw error;
  }
}
