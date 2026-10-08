import { formatAmount, formatLine } from "./formatters.js";

/** Prints a receipt for an order. */
export class Receipt {
  /**
   * Builds a receipt for an order with nothing on it.
   *
   * Static, and written in JavaScript rather than TypeScript on purpose: a
   * symbol counter walks both, so this is the fourth static method the corpus
   * holds and the one a counter narrowed to `**\/*.service.ts` does not find.
   */
  static blank() {
    return new Receipt();
  }

  /** Renders every line, then the total beneath them. */
  render(order) {
    const lines = order.lines.map((line) =>
      formatLine(line.quantity, line.itemIdentifier),
    );

    return [...lines, formatAmount(order.total)].join("\n");
  }
}
