import { describe, expect, it } from "vitest";

import * as core from "./index";

describe("@conformetry/core", () => {
  it("exports the service module components", () => {
    expect(Object.keys(core)).toStrictEqual([
      "ConformetryCoreModule",
      "ConformetryCoreService",
    ]);
  });
});
