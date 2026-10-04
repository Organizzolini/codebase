import { describe, expect, it } from "vitest";

import { environmentSchema } from "./constants";

describe("main end-to-end suite", () => {
  describe("environment schema e2e", () => {
    it("allows an empty schema by default", () => {
      expect.hasAssertions();

      const parsed = environmentSchema.parse({});

      expect(environmentSchema.parse({})).toStrictEqual({
        POSTGRES_DB: "meanderaw_development",
        POSTGRES_HOST: "localhost",
        POSTGRES_PASSWORD: "postgres",
        POSTGRES_PORT: 5432,
        POSTGRES_SCHEMA: "meanderaw_development",
        POSTGRES_USER: "postgres",
        SWEEP_EDGE_BUDGET: parsed.SWEEP_EDGE_BUDGET,
        SWEEP_MAXIMUM_COLUMNS: parsed.SWEEP_MAXIMUM_COLUMNS,
        SWEEP_MAXIMUM_ROWS: parsed.SWEEP_MAXIMUM_ROWS,
      });
    });
  });
});
