import { describe, expect, it } from "vitest";

import { chargeTax } from "./tax.utilities.js";

describe("chargeTax", () => {
  it("adds a fifth at the standard rate", () => {
    expect(chargeTax(1000)).toBe(1200);
  });
});
