import { describe, expect, it } from "vitest";

import * as core from "./index";

describe("@codependix/core", () => {
  it("exports the service module components", () => {
    expect(Object.keys(core)).toStrictEqual([
      "CodependixCoreModule",
      "CodependixCoreService",
    ]);
  });
});
