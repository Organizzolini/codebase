import { describe, expect, it } from "vitest";

import { ShippingService } from "./shipping.service.js";

describe("ShippingService", () => {
  it("quotes nothing for collection in person", () => {
    expect(ShippingService.free("counter").cost).toBe(0);
  });
});
