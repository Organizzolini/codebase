import { describe, expect, it } from "vitest";

import { SearchModule } from "./search.module";

describe("search module suite", () => {
  it("instantiates SearchModule", () => {
    expect.hasAssertions();

    const module = new SearchModule();

    expect(module).toBeDefined();
  });
});
