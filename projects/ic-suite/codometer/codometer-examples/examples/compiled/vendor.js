// A second compiled file, so a target's `exclude` and `!` negation have
// something to remove and the file count moves visibly when they do.
"use strict";

function formatAmount(amount) {
  return (amount / 100).toFixed(2);
}

function formatLine(quantity, name) {
  return `${quantity} × ${name}`;
}

function renderReceipt(order) {
  const lines = order.lines.map((line) => {
    return formatLine(line.quantity, line.itemIdentifier);
  });
  return lines.concat(formatAmount(order.total)).join("\n");
}

export { formatAmount, formatLine, renderReceipt };
