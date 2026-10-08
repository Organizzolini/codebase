import { type Order } from "./orders.types.js";

/** Where an order is going and what it costs to get it there. */
export interface Shipment {
  cost: number;
  destination: string;
}

/** Works out what shipping an order costs. */
export class ShippingService {
  /** Quotes shipping for an order to one destination. */
  public quote(order: Order, destination: string): Shipment {
    return { cost: order.lines.length * 250, destination };
  }

  /** Quotes nothing, which is what collecting in person costs. */
  public static free(destination: string): Shipment {
    return { cost: 0, destination };
  }
}
