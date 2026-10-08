import { type OrderLine } from "./orders.types.js";

/** Totals one line, which is its quantity at its unit price. */
export const priceLine = (line: OrderLine): number =>
  line.quantity * line.unitPrice;

/** Applies a discount expressed in basis points. */
export function applyDiscount(amount: number, basisPoints: number): number {
  return Math.round(amount * (1 - basisPoints / 10_000));
}
