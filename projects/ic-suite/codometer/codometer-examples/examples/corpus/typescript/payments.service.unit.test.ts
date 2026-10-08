import { describe, expect, it } from "vitest";

import { PaymentsService } from "./payments.service.js";

describe("PaymentsService", () => {
  it("takes nothing for a free order", () => {
    expect(PaymentsService.none("order-1").amount).toBe(0);
  });
});
