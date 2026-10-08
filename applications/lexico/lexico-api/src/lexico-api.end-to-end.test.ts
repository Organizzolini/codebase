import { describe, expect, it } from "vitest";

import { environmentSchema } from "./lexico-api.constants";

describe("lexico api end-to-end suite", () => {
  describe("environment schema e2e", () => {
    it("applies defaults for an empty config", () => {
      expect.hasAssertions();
      expect(environmentSchema.parse({})).toStrictEqual({
        LEXICO_API_CORS_ORIGINS: ["http://localhost:3000"],
        LEXICO_API_LIGHTSHIP_PORT: 9000,
        LEXICO_API_PORT: 8398,
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

    it("splits comma-separated CORS origins and drops blank entries", () => {
      expect.hasAssertions();
      expect(
        environmentSchema.parse({
          LEXICO_API_CORS_ORIGINS:
            "https://lexicolatin.com, https://www.lexicolatin.com,",
        }).LEXICO_API_CORS_ORIGINS,
      ).toStrictEqual([
        "https://lexicolatin.com",
        "https://www.lexicolatin.com",
      ]);
    });
  });
});
