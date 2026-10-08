/** One line on an order: a catalog item and how many of it were wanted. */
export interface OrderLine {
  itemIdentifier: string;
  quantity: number;
  unitPrice: number;
}

/** A placed order, as the sample services pass it around. */
export interface Order {
  currency: string;
  identifier: string;
  lines: OrderLine[];
}

/** How far along an order is. */
export enum OrderStatus {
  Cancelled = "cancelled",
  Placed = "placed",
  Shipped = "shipped",
}

/** A store of records addressed by identifier. */
export interface Repository<Record> {
  find(identifier: string): Record | undefined;
}
