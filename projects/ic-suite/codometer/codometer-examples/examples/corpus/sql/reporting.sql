-- Reporting queries over the sample order tables.

CREATE TABLE orders (
    identifier TEXT PRIMARY KEY,
    currency TEXT NOT NULL,
    placed_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE order_lines (
    order_identifier TEXT NOT NULL REFERENCES orders (identifier),
    item_identifier TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price INTEGER NOT NULL
);

INSERT INTO orders (identifier, currency, placed_at)
VALUES ('order-1', 'USD', now());

UPDATE orders
SET currency = 'EUR'
WHERE identifier = 'order-1';

WITH totals AS (
    SELECT
        order_identifier,
        sum(quantity * unit_price) AS amount
    FROM order_lines
    GROUP BY order_identifier
)

SELECT
    orders.identifier,
    totals.amount
FROM orders
INNER JOIN totals ON orders.identifier = totals.order_identifier;

DELETE FROM order_lines
WHERE quantity = 0;
