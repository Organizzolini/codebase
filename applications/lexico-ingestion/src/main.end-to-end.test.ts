import { describe, expect, it } from "vitest";

import { environmentSchema } from "./constants";

describe("main end-to-end suite", () => {
  describe("environment schema e2e", () => {
    it("allows an empty schema by default", () => {
      expect.hasAssertions();
      expect(environmentSchema.parse({})).toStrictEqual({
        LEXICO_POSTGRES_DATABASE: "lexico_development",
        LEXICO_POSTGRES_HOST: "localhost",
        LEXICO_POSTGRES_PASSWORD: "lexico_password",
        LEXICO_POSTGRES_PORT: 5432,
        LEXICO_POSTGRES_SCHEMA: "lexico",
        LEXICO_POSTGRES_USERNAME: "lexico_username",
      });
    });

    it("reads only LEXICO_POSTGRES_*, ignoring the root's admin login", () => {
      expect.hasAssertions();

      const environment = environmentSchema.parse({
        POSTGRES_DB: "postgres",
        POSTGRES_PASSWORD: "postgres",
        POSTGRES_USER: "postgres",
      });

      expect(environment).toMatchObject({
        LEXICO_POSTGRES_DATABASE: "lexico_development",
        LEXICO_POSTGRES_PASSWORD: "lexico_password",
        LEXICO_POSTGRES_USERNAME: "lexico_username",
      });
      expect(environment).not.toHaveProperty("POSTGRES_DB");
    });

    it("should parse an empty environment schema with defaults", () => {
      expect(environmentSchema.parse({})).toStrictEqual({
        LEXICO_POSTGRES_DATABASE: "lexico_development",
        LEXICO_POSTGRES_HOST: "localhost",
        LEXICO_POSTGRES_PASSWORD: "lexico_password",
        LEXICO_POSTGRES_PORT: 5432,
        LEXICO_POSTGRES_SCHEMA: "lexico",
        LEXICO_POSTGRES_USERNAME: "lexico_username",
      });
    });
  });
});
