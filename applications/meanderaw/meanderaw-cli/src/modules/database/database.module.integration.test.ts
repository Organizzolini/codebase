import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { DataSource } from "typeorm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  TEST_DATABASE_NAME,
  TEST_POSTGRES_IMAGE,
  TEST_SCHEMA_INITIALIZATION,
} from "../../../testing/database";
import { meanderRecord } from "../../../testing/meanders";
import { environmentSchema } from "../../constants";

import { DatabaseModule } from "./database.module";
import { DatabaseService } from "./database.service";

import type { TestingModule } from "@nestjs/testing";

// 🧪 Tests

/**
 * Boots the real `DatabaseModule` from configuration alone, the way the CLI
 * does, against a throwaway Postgres container standing in for the local
 * one: the server's address, credentials, database, and schema all arrive
 * as `MEANDERAW_POSTGRES_*` variables, while the unprefixed `POSTGRES_DB`
 * the workspace root's `.env` sets for lexico is ignored. The test names a
 * database and schema other than the `meanderaw_development` default, so it
 * passes only by reading them.
 */
describe(DatabaseModule, () => {
  let container: StartedPostgreSqlContainer;
  let module: TestingModule;

  beforeAll(async () => {
    container = await new PostgreSqlContainer(TEST_POSTGRES_IMAGE)
      .withDatabase(TEST_DATABASE_NAME)
      .withCopyContentToContainer([TEST_SCHEMA_INITIALIZATION])
      .start();

    // 🎯 The workspace root's `.env`, which Nx loads into every task, names
    // lexico's database under the unprefixed variable; it must be ignored.
    vi.stubEnv("POSTGRES_DB", "postgres");
    vi.stubEnv("MEANDERAW_POSTGRES_DB", TEST_DATABASE_NAME);
    vi.stubEnv("MEANDERAW_POSTGRES_HOST", container.getHost());
    vi.stubEnv("MEANDERAW_POSTGRES_PASSWORD", container.getPassword());
    vi.stubEnv("MEANDERAW_POSTGRES_PORT", String(container.getPort()));
    vi.stubEnv("MEANDERAW_POSTGRES_SCHEMA", TEST_DATABASE_NAME);
    vi.stubEnv("MEANDERAW_POSTGRES_USER", container.getUsername());

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          isGlobal: true,
          validate: (config: Record<string, unknown>) =>
            environmentSchema.parse(config),
        }),
        DatabaseModule,
      ],
    }).compile();
  });

  afterAll(async () => {
    await module.close();
    await container.stop();
    vi.unstubAllEnvs();
  });

  it("writes rows into the schema MEANDERAW_POSTGRES_SCHEMA names, every column in snake case", async () => {
    await module.get(DatabaseService).save(meanderRecord({ code: "01x02y0" }));

    const columns: { column_name: string }[] = await module
      .get(DataSource)
      .query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'meanders' ORDER BY column_name",
        [TEST_DATABASE_NAME],
      );

    expect(columns.map((column) => column.column_name)).toStrictEqual([
      "characteristics",
      "code",
      "columns",
      "id",
      "is_hardcoded",
      "lattice",
      "repeats",
      "rows",
      "symmetrical_codes",
    ]);
  });

  it("reads back the row it wrote", async () => {
    await expect(
      module.get(DatabaseService).findOneByCode("01x02y0"),
    ).resolves.toMatchObject({ code: "01x02y0", isHardcoded: true });
  });
});
