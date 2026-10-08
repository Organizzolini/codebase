import { describe, expect, it } from "vitest";

import { MainModule, MapCommand, MapModule } from "./index.js";

describe("codependix-cli index", () => {
  it("exports the CLI surface", () => {
    expect(MainModule).toBeDefined();
    expect(MapModule).toBeDefined();
    expect(MapCommand).toBeDefined();
  });
});
