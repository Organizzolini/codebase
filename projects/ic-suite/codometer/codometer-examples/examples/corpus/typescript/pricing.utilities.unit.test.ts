import { describe, expect, it } from "vitest";

import { applyDiscount } from "./pricing.utilities.js";

describe("applyDiscount", () => {
  it("takes a tenth off at a thousand basis points", () => {
    expect(applyDiscount(1000, 1000)).toBe(900);
  });
});
