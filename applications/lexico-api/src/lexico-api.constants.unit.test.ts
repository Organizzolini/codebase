import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

describe("lexico api constants", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("emits the GraphQL schema beside the root module whatever the working directory", async () => {
    vi.spyOn(process, "cwd").mockReturnValue("/somewhere/else/entirely");

    const { GRAPHQL_SCHEMA_FILE } = await import("./lexico-api.constants");

    expect(GRAPHQL_SCHEMA_FILE).toBe(
      path.join(import.meta.dirname, "schema.gql"),
    );
  });
});
