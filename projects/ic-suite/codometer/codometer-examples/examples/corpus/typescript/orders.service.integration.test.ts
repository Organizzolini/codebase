import { describe, expect, it } from "vitest";

import { OrdersService } from "./orders.service.js";
import { PaymentsService } from "./payments.service.js";

describe("placing an order", () => {
  it("takes a payment for what the order totals", async () => {
    const orders = new OrdersService();
    const payments = new PaymentsService();
    const order = OrdersService.empty("order-1");

    order.lines.push({ itemIdentifier: "item-1", quantity: 3, unitPrice: 400 });

    const payment = await payments.take(order, orders.total(order));

    expect(payment.amount).toBe(1200);
  });
});
