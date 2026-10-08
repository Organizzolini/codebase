import { ConfigService } from "@nestjs/config";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";

import { startDatabaseTestingModule } from "../../../testing/database-testing.utilities";
import { FixtureDatabaseModule } from "../../../testing/fixtures/fixture-database.module";
import { CreateWidgets1767225600000 } from "../../../testing/fixtures/migrations/1767225600000-create-widgets";
import { SAMPLE_GREETING } from "../../../testing/fixtures/sample-greeting.constants";
import { SampleGreetingModule } from "../../../testing/fixtures/sample-greeting.module";
import { SampleWidgetsModule } from "../../../testing/fixtures/sample-widgets.module";
import { SampleWidgetsService } from "../../../testing/fixtures/sample-widgets.service";
import { Widget } from "../../../testing/fixtures/widget.entity";

import { postgresEnvironmentSchema } from "./database.utilities";

import type { DatabaseTestingModule } from "../../../testing/database-testing.types";

// 🧪 Tests

/** A host no resolver can reach, standing in for a developer's own setting. */
const STRAY_HOST = "stray.invalid";

describe(startDatabaseTestingModule, () => {
  describe("with its own connection", () => {
    let database: DatabaseTestingModule;

    beforeAll(async () => {
      // 🎯 A prefixed variable already in the environment, as a developer's
      // `.env` would set it, must not redirect the testing module.
      process.env["FIXTURE_POSTGRES_HOST"] = STRAY_HOST;

      const environmentSchema = z.object({
        ...postgresEnvironmentSchema({ project: "fixture" }),
        SAMPLE_LEVEL: z.string().default("info"),
      });

      database = await startDatabaseTestingModule({
        entities: [Widget],
        imports: [SampleGreetingModule],
        migrations: [CreateWidgets1767225600000],
        project: "fixture",
        providers: [SampleWidgetsService],
        validate: (config) => environmentSchema.parse(config),
      });
    });

    afterAll(async () => {
      await database.close();
      delete process.env["FIXTURE_POSTGRES_HOST"];
    });

    it("connects the module as the project's role to its migrated _testing database", async () => {
      const [session]: { database: string; role: string; schema: string }[] =
        await database.dataSource.query(
          "SELECT current_database() AS database, current_user AS role, current_schema() AS schema",
        );

      expect(session).toStrictEqual({
        database: "fixture_testing",
        role: "fixture_username",
        schema: "fixture",
      });
    });

    it("hands back a repository for an entity it was given", async () => {
      const widgets = database.repository(Widget);

      const widget = await widgets.save(
        widgets.create({ displayName: "Sprocket" }),
      );

      await expect(widgets.findOneBy({ id: widget.id })).resolves.toMatchObject(
        { displayName: "Sprocket" },
      );
    });

    it("resolves the providers and imports it was given", async () => {
      const widget = await database.module.get(SampleWidgetsService).add("Cog");

      expect(widget.displayName).toBe("Cog");
      expect(database.module.get(SAMPLE_GREETING)).toBe("hello");
    });

    it("validates configuration with the schema it was given", () => {
      expect(database.module.get(ConfigService).get("SAMPLE_LEVEL")).toBe(
        "info",
      );
    });

    it("puts each variable back as it was on close, and stops its connection", async () => {
      const closing = await startDatabaseTestingModule({
        entities: [Widget],
        migrations: [CreateWidgets1767225600000],
        namingStrategy: new SnakeNamingStrategy(),
        project: "fixture",
      });

      expect(process.env["FIXTURE_POSTGRES_PORT"]).toBe(
        String(closing.container.connection.port),
      );

      await closing.close();

      expect(process.env["FIXTURE_POSTGRES_PORT"]).toBe(
        String(database.container.connection.port),
      );
      expect(closing.dataSource.isInitialized).toBe(false);
    });

    it("stops the container and restores the environment when the module fails to boot", async () => {
      await expect(
        startDatabaseTestingModule({
          entities: [Widget],
          migrations: [CreateWidgets1767225600000],
          project: "fixture",
          providers: [
            {
              provide: "SAMPLE_BROKEN",
              useFactory: (): never => {
                throw new Error("The provider failed.");
              },
            },
          ],
        }),
      ).rejects.toThrow("The provider failed.");

      expect(process.env["FIXTURE_POSTGRES_PORT"]).toBe(
        String(database.container.connection.port),
      );
    });
  });

  describe("with an application's environment schema", () => {
    it("removes every default its validation wrote into the environment on close", async () => {
      const environmentSchema = z.object({
        ...postgresEnvironmentSchema({ project: "fixture" }),
        SAMPLE_LEVEL: z.string().default("info"),
      });

      const database = await startDatabaseTestingModule({
        entities: [Widget],
        migrations: [CreateWidgets1767225600000],
        project: "fixture",
        validate: (config) => environmentSchema.parse(config),
      });

      expect(process.env["SAMPLE_LEVEL"]).toBe("info");

      await database.close();

      expect(process.env["SAMPLE_LEVEL"]).toBeUndefined();
    });
  });

  describe("with the project's own database module", () => {
    it("shares that module's one connection with the modules under test, then restores the environment", async () => {
      process.env["FIXTURE_POSTGRES_HOST"] = STRAY_HOST;

      try {
        const database = await startDatabaseTestingModule({
          database: FixtureDatabaseModule,
          entities: [Widget],
          imports: [SampleWidgetsModule],
          migrations: [CreateWidgets1767225600000],
          project: "fixture",
        });

        try {
          const widget = await database.module
            .get(SampleWidgetsService)
            .add("Gear");

          await expect(
            database.repository(Widget).findOneBy({ id: widget.id }),
          ).resolves.toMatchObject({ displayName: "Gear" });

          // 🎯 One pool, so one idle backend for the role: a second
          // `forRoot` would hold a second connection of its own.
          const [activity]: { backends: number }[] =
            await database.dataSource.query(
              "SELECT count(*)::int AS backends FROM pg_stat_activity WHERE usename = 'fixture_username' AND datname = 'fixture_testing'",
            );

          expect(activity?.backends).toBe(1);
        } finally {
          await database.close();
        }

        expect(process.env["FIXTURE_POSTGRES_HOST"]).toBe(STRAY_HOST);
        expect(process.env["FIXTURE_POSTGRES_DATABASE"]).toBeUndefined();
      } finally {
        delete process.env["FIXTURE_POSTGRES_HOST"];
      }
    });
  });
});
