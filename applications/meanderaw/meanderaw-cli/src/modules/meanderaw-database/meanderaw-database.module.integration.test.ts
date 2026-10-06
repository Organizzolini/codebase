import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { DataSource } from "typeorm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  type StartedPostgresContainer,
  startPostgresContainer,
} from "@codebase/database/testing";

import { meanderRecord } from "../../../testing/meanders";
import { environmentSchema } from "../../constants";

import { MeanderawDatabaseModule } from "./meanderaw-database.module";
import { MeanderawDatabaseService } from "./meanderaw-database.service";

import type { TestingModule } from "@nestjs/testing";

// 🧪 Tests

/**
 * Boots the real `MeanderawDatabaseModule` from configuration alone, the way the CLI
 * does, against a throwaway Postgres container standing in for the local
 * one, migrated by the project's real migrations: the server's address,
 * credentials, database, and schema all arrive as `MEANDERAW_POSTGRES_*`
 * variables, while the unprefixed `POSTGRES_DB` the workspace root's `.env`
 * sets for the shared container's admin login is ignored.
 */
describe(MeanderawDatabaseModule, () => {
  let container: StartedPostgresContainer;
  let module: TestingModule;

  beforeAll(async () => {
    container = await startPostgresContainer({
      migrations: [],
      project: "meanderaw",
    });

    // 🎯 The workspace root's `.env`, which Nx loads into every task, names
    // the admin login under the unprefixed variable; it must be ignored.
    vi.stubEnv("POSTGRES_DB", "postgres");

    for (const [key, value] of Object.entries(container.environment)) {
      vi.stubEnv(key, value);
    }

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          isGlobal: true,
          validate: (config: Record<string, unknown>) =>
            environmentSchema.parse(config),
        }),
        MeanderawDatabaseModule,
      ],
    }).compile();
  });

  afterAll(async () => {
    await module.close();
    await container.stop();
    vi.unstubAllEnvs();
  });

  it("writes rows into the meanderaw schema, every column in snake case", async () => {
    await module
      .get(MeanderawDatabaseService)
      .save(meanderRecord({ code: "01x02y0" }));

    const columns: { column_name: string }[] = await module
      .get(DataSource)
      .query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'meanders' ORDER BY column_name",
        [container.connection.schema],
      );

    expect(columns.map((column) => column.column_name)).toStrictEqual([
      "characteristics",
      "code",
      "columns",
      "family",
      "id",
      "is_hardcoded",
      "lattice",
      "repeats",
      "rows",
      "symmetrical_codes",
    ]);
    expect(container.connection.schema).toBe("meanderaw");
  });

  it("reads back the row it wrote", async () => {
    await expect(
      module.get(MeanderawDatabaseService).findOneByCode("01x02y0"),
    ).resolves.toMatchObject({ code: "01x02y0", isHardcoded: true });
  });
});
