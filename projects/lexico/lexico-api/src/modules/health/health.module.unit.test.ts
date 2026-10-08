import { describe, expect, it } from "vitest";

import { HealthModule } from "./health.module";

describe("health module suite", () => {
  it("instantiates HealthModule", () => {
    expect.hasAssertions();

    const module = new HealthModule();

    expect(module).toBeDefined();
  });
});
