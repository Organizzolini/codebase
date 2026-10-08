import { describe, expect, it } from "vitest";

import { ConfigurationModule } from "./configuration.module.js";

describe(ConfigurationModule, () => {
  it("is defined", () => {
    expect(ConfigurationModule).toBeDefined();
  });
});
