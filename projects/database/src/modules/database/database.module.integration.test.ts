import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { Gadget } from "../../../testing/fixtures/gadget.entity";
import { CreateWidgets1767225600000 } from "../../../testing/fixtures/migrations/1767225600000-create-widgets";
import { Widget } from "../../../testing/fixtures/widget.entity";

import { DatabaseModule } from "./database.module";
import {
  createDataSource,
  postgresEnvironmentSchema,
} from "./database.utilities";
import { startPostgresContainer } from "./postgres-container.utilities";

import type { StartedPostgresContainer } from "./postgres-container.types";
import type { TestingModule } from "@nestjs/testing";
import type { Repository } from "typeorm";

// 🧪 Tests

/**
 * Boots the real `DatabaseModule.forRoot` from configuration alone, the way
 * an application does, against a container the `testing` entry started and
 * migrated. Only the host, the port, and the `_testing` database are set;
 * the role, its password, and the schema hold at the project's defaults
 * while the root's unprefixed `POSTGRES_*` name the admin login.
 */
describe(DatabaseModule, () => {
  let container: StartedPostgresContainer;
  let module: TestingModule;

  beforeAll(async () => {
    container = await startPostgresContainer({
      migrations: [CreateWidgets1767225600000],
      project: "fixture",
    });

    // 🎯 The root `.env`, which Nx loads into every task, names the admin
    // login under the unprefixed variables; all three must be ignored.
    vi.stubEnv("POSTGRES_DB", "postgres");
    vi.stubEnv("POSTGRES_PASSWORD", "postgres");
    vi.stubEnv("POSTGRES_USER", "postgres");
    vi.stubEnv("FIXTURE_POSTGRES_DATABASE", container.connection.database);
    vi.stubEnv("FIXTURE_POSTGRES_HOST", container.connection.host);
    vi.stubEnv("FIXTURE_POSTGRES_PORT", String(container.connection.port));

    const environmentSchema = z.object(
      postgresEnvironmentSchema({ project: "fixture" }),
    );

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          isGlobal: true,
          validate: (config: Record<string, unknown>) =>
            environmentSchema.parse(config),
        }),
        DatabaseModule.forRoot({
          entities: [Widget],
          project: "fixture",
        }),
        TypeOrmModule.forFeature([Widget]),
      ],
    }).compile();
  });

  afterAll(async () => {
    await module.close();
    await container.stop();
    vi.unstubAllEnvs();
  });

  it("connects as the project's role to its _testing database", async () => {
    const [session]: { database: string; role: string }[] = await module
      .get(DataSource)
      .query("SELECT current_database() AS database, current_user AS role");

    expect(session).toStrictEqual({
      database: "fixture_testing",
      role: "fixture_username",
    });
  });

  it("pins every pooled connection's search path to the project's schema alone", async () => {
    const dataSource = module.get(DataSource);
    const queryRunners = [1, 2, 3].map(() => dataSource.createQueryRunner());

    try {
      // 🎯 Each runner holds its own pooled connection until released.
      const sessions = await Promise.all(
        queryRunners.map(async (queryRunner) =>
          dataSource.query<
            { pid: number; schema: string; searchPath: string }[]
          >(
            `SELECT current_setting('search_path') AS "searchPath", current_schema() AS schema, pg_backend_pid() AS pid`,
            [],
            queryRunner,
          ),
        ),
      );
      const rows = sessions.flat();

      expect(new Set(rows.map(({ pid }) => pid)).size).toBe(3);
      expect(
        rows.map(({ schema, searchPath }) => ({ schema, searchPath })),
      ).toStrictEqual([
        { schema: "fixture", searchPath: "fixture" },
        { schema: "fixture", searchPath: "fixture" },
        { schema: "fixture", searchPath: "fixture" },
      ]);
    } finally {
      await Promise.all(
        queryRunners.map(async (queryRunner) => queryRunner.release()),
      );
    }
  });

  it("creates an unqualified table in the project's schema rather than public", async () => {
    const dataSource = module.get(DataSource);

    await dataSource.query("CREATE TABLE unqualified_notes (body text)");

    try {
      const tables: { schema: string }[] = await dataSource.query(
        "SELECT table_schema AS schema FROM information_schema.tables WHERE table_name = 'unqualified_notes'",
      );

      expect(tables).toStrictEqual([{ schema: "fixture" }]);
    } finally {
      await dataSource.query("DROP TABLE unqualified_notes");
    }
  });

  it("plans a generated column's metadata row under the project's schema", async () => {
    const dataSource = createDataSource(
      { entities: [Gadget], migrations: [], project: "fixture" },
      container.environment,
    );

    await dataSource.initialize();

    try {
      const { upQueries } = await dataSource.driver.createSchemaBuilder().log();

      // 🎯 Only the row is planned, under the generating database's name:
      // creating the table and naming the database stay hand edits.
      expect(
        upQueries
          .filter(({ query }) => query.includes("typeorm_metadata"))
          .map(({ parameters, query }) => ({ parameters, query })),
      ).toStrictEqual([
        {
          parameters: [
            "fixture_testing",
            "fixture",
            "gadgets",
            "GENERATED_COLUMN",
            "search_name",
            "lower(display_name)",
          ],
          query: `INSERT INTO "fixture"."typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES ($1, $2, $3, $4, $5, $6)`,
        },
      ]);
    } finally {
      await dataSource.destroy();
    }
  });

  it("finds its table in the project's schema, every column in snake case", async () => {
    const columns: { column_name: string }[] = await module
      .get(DataSource)
      .query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = 'fixture' AND table_name = 'widgets' ORDER BY column_name",
      );

    expect(columns.map(({ column_name }) => column_name)).toStrictEqual([
      "created_at",
      "created_by",
      "deleted_at",
      "deleted_by",
      "display_name",
      "id",
      "updated_at",
      "updated_by",
    ]);
  });

  it("was built by the migrations rather than by synchronizing", async () => {
    const dataSource = module.get(DataSource);
    const migrations: { name: string }[] = await dataSource.query(
      "SELECT name FROM fixture.migrations",
    );
    const pending = await dataSource.driver.createSchemaBuilder().log();

    expect(migrations).toStrictEqual([{ name: "CreateWidgets1767225600000" }]);
    expect(pending.upQueries).toStrictEqual([]);
  });

  it("assigns every new row a uuidv7 id and its timestamps in the database", async () => {
    const widgets = module.get<Repository<Widget>>(getRepositoryToken(Widget));

    const widget = await widgets.save(
      widgets.create({ displayName: "Sprocket" }),
    );

    expect(widget.id).toMatch(
      /^[\da-f]{8}-[\da-f]{4}-7[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/,
    );
    expect(widget.createdAt).toBeInstanceOf(Date);
    expect(widget.updatedAt).toBeInstanceOf(Date);
    expect(widget).toMatchObject({ createdBy: null, deletedAt: null });
  });

  it("soft-deletes a row rather than removing it", async () => {
    const widgets = module.get<Repository<Widget>>(getRepositoryToken(Widget));
    const widget = await widgets.save(widgets.create({ displayName: "Fret" }));

    await widgets.softDelete(widget.id);

    await expect(widgets.findOneBy({ id: widget.id })).resolves.toBeNull();

    const deleted = await widgets.findOne({
      where: { id: widget.id },
      withDeleted: true,
    });

    expect(deleted?.deletedAt).toBeInstanceOf(Date);
  });
});
