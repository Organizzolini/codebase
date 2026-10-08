import { type Order } from "./orders.types.js";

/** A payment taken against an order. */
export interface Payment {
  amount: number;
  orderIdentifier: string;
}

/** Takes payments against orders. */
export class PaymentsService {
  /** Takes a payment for the whole of an order. */
  public async take(order: Order, amount: number): Promise<Payment> {
    await Promise.resolve();

    return { amount, orderIdentifier: order.identifier };
  }

  /** Builds a payment of nothing, which is what a free order takes. */
  public static none(orderIdentifier: string): Payment {
    return { amount: 0, orderIdentifier };
  }
}
