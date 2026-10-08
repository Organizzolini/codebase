import { DataSource } from "typeorm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  type DatabaseTestingModule,
  startDatabaseTestingModule,
} from "@codebase/database/testing";

import { meanderRecord } from "../../../testing/meanders";
import { environmentSchema } from "../../constants";

import { Meander } from "./entities/meander.entity";
import { MeanderawDatabaseModule } from "./meanderaw-database.module";
import { MeanderawDatabaseService } from "./meanderaw-database.service";
import { Migration1791160950069 } from "./migrations/1791160950069-migration";
import { Migration1791414023001 } from "./migrations/1791414023001-migration";

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
  let database: DatabaseTestingModule;

  beforeAll(async () => {
    // 🎯 The workspace root's `.env`, which Nx loads into every task, names
    // the admin login under the unprefixed variable; it must be ignored.
    vi.stubEnv("POSTGRES_DB", "postgres");

    database = await startDatabaseTestingModule({
      database: MeanderawDatabaseModule,
      entities: [Meander],
      migrations: [Migration1791160950069, Migration1791414023001],
      project: "meanderaw",
      validate: (config) => environmentSchema.parse(config),
    });
  });

  afterAll(async () => {
    await database.close();
    vi.unstubAllEnvs();
  });

  it("writes rows into the meanderaw schema, every column in snake case", async () => {
    await database.module
      .get(MeanderawDatabaseService)
      .save(meanderRecord({ code: "01x02y0" }));

    const columns: { column_name: string }[] = await database.module
      .get(DataSource)
      .query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'meanders' ORDER BY column_name",
        [database.container.connection.schema],
      );

    expect(columns.map((column) => column.column_name)).toStrictEqual([
      "characteristics",
      "code",
      "columns",
      "created_at",
      "created_by",
      "id",
      "is_hardcoded",
      "lattice",
      "repeats",
      "rows",
      "symmetrical_codes",
      "updated_at",
      "updated_by",
    ]);
    expect(database.container.connection.schema).toBe("meanderaw");
  });

  it("reads back the row it wrote", async () => {
    await expect(
      database.module.get(MeanderawDatabaseService).findOneByCode("01x02y0"),
    ).resolves.toMatchObject({ code: "01x02y0", isHardcoded: true });
  });

  it("builds the table by migration alone, never by synchronizing", async () => {
    const migrations: unknown[] = await database.module
      .get(DataSource)
      .query(`SELECT name FROM "meanderaw"."migrations" ORDER BY timestamp`);

    expect(migrations).toStrictEqual([
      { name: "Migration1791160950069" },
      { name: "Migration1791414023001" },
    ]);
  });
});
