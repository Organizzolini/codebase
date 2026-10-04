import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { CreateWidgets1767225600000 } from "../../../testing/fixtures/migrations/1767225600000-create-widgets";
import { Widget } from "../../../testing/fixtures/widget.entity";

import { DatabaseModule } from "./database.module";
import { postgresEnvironmentSchema } from "./database.utilities";
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
