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
        POSTGRES_DB: "postgres",
        POSTGRES_HOST: "localhost",
        POSTGRES_PASSWORD: "postgres",
        POSTGRES_PORT: 5432,
        POSTGRES_USER: "postgres",
      });
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
