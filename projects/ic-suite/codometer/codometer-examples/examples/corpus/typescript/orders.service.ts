import { DEFAULT_CURRENCY } from "./orders.constants.js";
import { type Order, type OrderLine } from "./orders.types.js";

/** Reads orders and totals what they are worth. */
export class OrdersService {
  private readonly orders = new Map<string, Order>();

  /** Reads one order, or nothing where no order answers to the identifier. */
  public find(identifier: string): Order | undefined {
    return this.orders.get(identifier);
  }

  /** Totals every line on an order. */
  public total(order: Order): number {
    return order.lines.reduce(
      (running: number, line: OrderLine) =>
        running + line.quantity * line.unitPrice,
      0,
    );
  }

  /** Builds an order carrying no lines yet. */
  public static empty(identifier: string): Order {
    return { currency: DEFAULT_CURRENCY, identifier, lines: [] };
  }
}
