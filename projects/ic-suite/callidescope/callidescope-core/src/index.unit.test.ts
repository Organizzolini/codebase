import { describe, expect, it } from "vitest";

import * as core from "./index";

describe("@callidescope/core", () => {
  it("exports the service module components", () => {
    expect(Object.keys(core)).toStrictEqual([
      "CallidescopeCoreModule",
      "CallidescopeCoreService",
    ]);
  });
});
