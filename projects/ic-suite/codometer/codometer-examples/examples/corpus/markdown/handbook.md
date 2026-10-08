# Handbook

A short document with one of most things the markdown analyzer counts.

## Placing an order

An order is a list of lines. Each line names a catalog item and a quantity,
and the order totals to the sum of its lines.

> An order with no lines totals nothing, which is legal.

### Rules

1. A line quantity is at least one.
2. A line quantity is at most ninety-nine.
3. An order carries exactly one currency.

- Placed orders may be cancelled.
- Shipped orders may not.

| Status | May cancel | May ship |
| ------ | ---------- | -------- |
| Placed | yes | yes |
| Shipped | no | no |
| Cancelled | no | no |

## Reading the totals

Call `total(order)` for the amount in minor units:

```ts
const amount = orders.total(order);
```

See the [catalog](../json/catalog.json) for what the sample sells.

---

## Checklist

- [x] Lines priced
- [ ] Tax charged
