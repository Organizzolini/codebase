import { describe, expect, it } from "vitest";

import { OrdersService } from "./orders.service.js";

describe("OrdersService", () => {
  it("totals every line on an order", () => {
    const service = new OrdersService();
    const order = OrdersService.empty("order-1");

    order.lines.push({ itemIdentifier: "item-1", quantity: 2, unitPrice: 500 });

    expect(service.total(order)).toBe(1000);
  });
});
