// Stands in for compiled output. It sits beside the corpus rather than inside
// it, which is where a build directory really lives — so the target measuring
// it carries a `directory` hop, exactly as this workspace's own configuration
// does for `dist/`.
"use strict";

const DEFAULT_CURRENCY = "USD";
const MAXIMUM_LINE_QUANTITY = 99;

class OrdersService {
  constructor() {
    this.orders = new Map();
  }
  static empty(identifier) {
    return { currency: DEFAULT_CURRENCY, identifier, lines: [] };
  }
  find(identifier) {
    return this.orders.get(identifier);
  }
  total(order) {
    return order.lines.reduce(
      (running, line) => running + line.quantity * line.unitPrice,
      0,
    );
  }
}

class PaymentsService {
  static none(orderIdentifier) {
    return { amount: 0, orderIdentifier };
  }
  async take(order, amount) {
    await Promise.resolve();
    return { amount, orderIdentifier: order.identifier };
  }
}

class ShippingService {
  static free(destination) {
    return { cost: 0, destination };
  }
  quote(order, destination) {
    return { cost: order.lines.length * 250, destination };
  }
}

function applyDiscount(amount, basisPoints) {
  return Math.round(amount * (1 - basisPoints / 10000));
}

function chargeTax(amount) {
  return Math.round(amount * 1.2);
}

function priceLine(line) {
  return line.quantity * line.unitPrice;
}

export {
  applyDiscount,
  chargeTax,
  DEFAULT_CURRENCY,
  MAXIMUM_LINE_QUANTITY,
  OrdersService,
  PaymentsService,
  priceLine,
  ShippingService,
};
