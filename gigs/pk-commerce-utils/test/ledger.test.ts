import { test } from "node:test";
import assert from "node:assert/strict";
import { orderTotal, orderDue, customerBalance, amountsToCollect, type Order, type Payment } from "../src/index.js";

const o1: Order = { id: "o1", created_at: "2026-10-01", status: "pending", advance: 1000, items: [{ qty: 2, unit_price: 2500 }, { qty: 1, unit_price: 2800 }] };
const o2: Order = { id: "o2", created_at: "2026-10-05", status: "delivered", items: [{ qty: 1, unit_price: 3200 }], delivery_charge: 250, discount: 200 };
const cancelled: Order = { id: "o3", created_at: "2026-10-06", status: "cancelled", advance: 500, items: [{ qty: 1, unit_price: 9999 }] };

test("orderTotal adds delivery and subtracts discount", () => {
  assert.equal(orderTotal(o1), 7800);
  assert.equal(orderTotal(o2), 3250);
  assert.equal(orderTotal({ items: [{ qty: 1, unit_price: 100 }], discount: 500 }), 0);
});

test("orderDue counts advance and linked payments; cancelled is 0", () => {
  const pays: Payment[] = [{ amount: 1000, order_id: "o1" }];
  assert.equal(orderDue(o1, pays), 5800);
  assert.equal(orderDue(cancelled, pays), 0);
});

test("customerBalance ignores cancelled orders but keeps all payments (refund = credit)", () => {
  const pays: Payment[] = [{ amount: 1000 }, { amount: 300, order_id: "o3" }];
  // owed: (7800-1000) + 3250 = 10050; paid 1300
  assert.equal(customerBalance([o1, o2, cancelled], pays), 8750);
});

test("amountsToCollect never asks for more than the real balance (unlinked payments)", () => {
  // Order dues: o1 6800 (7800 - 1000 advance), o2 3250. A Rs 1,000 payment was recorded
  // without picking an order, so the customer really owes 6800 + 3250 - 1000 = 9050.
  const pays: Payment[] = [{ amount: 1000 }];
  const c = amountsToCollect([o1, { ...o2, status: "pending" }], pays);
  assert.equal(c.o1, 6800); // oldest order first, full due
  assert.equal(c.o2, 2250); // only what is left of the real balance (not 3250)
  assert.equal(c.o1 + c.o2, 9050);
});
