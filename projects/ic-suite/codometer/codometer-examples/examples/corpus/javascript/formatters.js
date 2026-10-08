/** Renders an amount in minor units as a decimal string. */
export function formatAmount(amount) {
  return (amount / 100).toFixed(2);
}

/** Renders a quantity and a name as one line of a receipt. */
export const formatLine = (quantity, name) => `${quantity} × ${name}`;
