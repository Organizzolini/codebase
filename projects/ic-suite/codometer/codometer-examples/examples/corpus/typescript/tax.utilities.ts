/** Rate tax is charged at where nothing else applies, in basis points. */
export const STANDARD_TAX_BASIS_POINTS = 2000;

/** Charges tax on an amount at the standard rate. */
export function chargeTax(amount: number): number {
  return Math.round(amount * (1 + STANDARD_TAX_BASIS_POINTS / 10_000));
}
