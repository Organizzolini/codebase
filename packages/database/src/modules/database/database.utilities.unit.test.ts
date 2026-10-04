import { DefaultNamingStrategy } from "typeorm";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  postgresConnection,
  postgresDataSourceOptions,
  postgresEnvironmentSchema,
} from "./database.utilities";

import type { PostgresConnection } from "./database.types";

// 🧪 Tests

const connection: PostgresConnection = {
  database: "fixture_development",
  host: "localhost",
  password: "fixture_password",
  port: 5432,
  schema: "fixture",
  username: "fixture_username",
};

describe("database utilities", () => {
  describe(postgresConnection, () => {
    it("reads the connection from the project's prefixed variables", () => {
      expect(
        postgresConnection({
          environment: {
            FIXTURE_POSTGRES_DATABASE: "fixture_testing",
            FIXTURE_POSTGRES_HOST: "database.internal",
            FIXTURE_POSTGRES_PORT: "6543",
            POSTGRES_DB: "postgres",
          },
          project: "fixture",
        }),
      ).toStrictEqual({
        database: "fixture_testing",
        host: "database.internal",
        password: "fixture_password",
        port: 6543,
        schema: "fixture",
        username: "fixture_username",
      });
    });
  });

  describe(postgresDataSourceOptions, () => {
    it("connects to the given database and schema as the given role", () => {
      expect(
        postgresDataSourceOptions(connection, { entities: [], migrations: [] }),
      ).toMatchObject({
        database: "fixture_development",
        host: "localhost",
        password: "fixture_password",
        port: 5432,
        schema: "fixture",
        type: "postgres",
        username: "fixture_username",
      });
    });

    it("never synchronizes and never runs migrations on start", () => {
      expect(
        postgresDataSourceOptions(connection, { entities: [], migrations: [] }),
      ).toMatchObject({ migrationsRun: false, synchronize: false });
    });

    it("names columns in snake case unless told otherwise", () => {
      expect(
        postgresDataSourceOptions(connection, { entities: [], migrations: [] })
          .namingStrategy,
      ).toBeInstanceOf(SnakeNamingStrategy);
    });

    it("uses the naming strategy it is given", () => {
      const namingStrategy = new DefaultNamingStrategy();

      expect(
        postgresDataSourceOptions(connection, {
          entities: [],
          migrations: [],
          namingStrategy,
        }).namingStrategy,
      ).toBe(namingStrategy);
    });

    it("passes the entities and migrations through", () => {
      expect(
        postgresDataSourceOptions(connection, {
          entities: ["src/**/*.entity.ts"],
          migrations: ["src/modules/fixture-database/migrations/*.ts"],
        }),
      ).toMatchObject({
        entities: ["src/**/*.entity.ts"],
        migrations: ["src/modules/fixture-database/migrations/*.ts"],
      });
    });
  });

  describe(postgresEnvironmentSchema, () => {
    it("defaults every variable from the project's name alone", () => {
      const environmentSchema = z.object(
        postgresEnvironmentSchema({ project: "fixture" }),
      );

      expect(environmentSchema.parse({})).toStrictEqual({
        FIXTURE_POSTGRES_DATABASE: "fixture_development",
        FIXTURE_POSTGRES_HOST: "localhost",
        FIXTURE_POSTGRES_PASSWORD: "fixture_password",
        FIXTURE_POSTGRES_PORT: 5432,
        FIXTURE_POSTGRES_SCHEMA: "fixture",
        FIXTURE_POSTGRES_USERNAME: "fixture_username",
      });
    });

    it("ignores the root's unprefixed variables", () => {
      const environmentSchema = z.object(
        postgresEnvironmentSchema({ project: "sample" }),
      );

      expect(
        environmentSchema.parse({
          POSTGRES_DB: "postgres",
          POSTGRES_PASSWORD: "postgres",
          POSTGRES_USER: "postgres",
        }),
      ).toMatchObject({
        SAMPLE_POSTGRES_DATABASE: "sample_development",
        SAMPLE_POSTGRES_PASSWORD: "sample_password",
        SAMPLE_POSTGRES_USERNAME: "sample_username",
      });
    });

    it("reads a set variable over its default, coercing the port to a number", () => {
      const environmentSchema = z.object(
        postgresEnvironmentSchema({ project: "fixture" }),
      );

      expect(
        environmentSchema.parse({
          FIXTURE_POSTGRES_DATABASE: "fixture_testing",
          FIXTURE_POSTGRES_PORT: "15432",
        }),
      ).toMatchObject({
        FIXTURE_POSTGRES_DATABASE: "fixture_testing",
        FIXTURE_POSTGRES_PORT: 15_432,
      });
    });

    it("spreads beside an application's own variables", () => {
      const environmentSchema = z.object({
        ...postgresEnvironmentSchema({ project: "fixture" }),
        LOG_LEVEL: z.string().default("info"),
      });

      expect(environmentSchema.parse({})).toMatchObject({
        FIXTURE_POSTGRES_SCHEMA: "fixture",
        LOG_LEVEL: "info",
      });
    });

    it("rejects a port that is not a positive integer", () => {
      const environmentSchema = z.object(
        postgresEnvironmentSchema({ project: "fixture" }),
      );

      expect(() =>
        environmentSchema.parse({ FIXTURE_POSTGRES_PORT: "not-a-port" }),
      ).toThrow(/expected number/i);
    });

    it("refuses a project name that cannot prefix a variable", () => {
      expect(() =>
        postgresEnvironmentSchema({ project: "fixture-api" }),
      ).toThrow(/fixture-api/);
    });
  });
});
