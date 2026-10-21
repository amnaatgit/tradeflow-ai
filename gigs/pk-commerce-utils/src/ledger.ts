// Khata (customer ledger) math for small sellers: orders, advances, payments, cancellations.
// Pure functions, so the same numbers show on every screen.

export type Item = { qty: number; unit_price: number | null };
export type Order = {
  id: string;
  created_at: string; // ISO date, used for oldest-first allocation
  status: "pending" | "delivered" | "cancelled" | string;
  items: Item[];
  advance?: number | null;
  delivery_charge?: number | null;
  discount?: number | null;
};
export type Payment = { amount: number; order_id?: string | null };

/** Items total + delivery charge - discount (never below 0). */
export function orderTotal(order: Pick<Order, "items" | "delivery_charge" | "discount">): number {
  const items = order.items.reduce((s, it) => s + (it.unit_price ?? 0) * it.qty, 0);
  return Math.max(0, items + (order.delivery_charge ?? 0) - (order.discount ?? 0));
}

/** Paid against one order: advance + payments linked to it. */
export function paidForOrder(order: Order, payments: Payment[]): number {
  const linked = payments.filter((p) => p.order_id === order.id).reduce((s, p) => s + p.amount, 0);
  return (order.advance ?? 0) + linked;
}

/** What is still due on one order (0 for cancelled orders). Can be negative if overpaid. */
export function orderDue(order: Order, payments: Payment[] = []): number {
  if (order.status === "cancelled") return 0;
  return orderTotal(order) - paidForOrder(order, payments);
}

/**
 * Customer balance: sum of non-cancelled order totals - advances - ALL payments.
 * Positive = customer owes you, negative = you owe them (credit).
 * Payments on a cancelled order still count, so a refund owed shows up as credit.
 */
export function customerBalance(orders: Order[], payments: Payment[]): number {
  const owed = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + orderTotal(o) - (o.advance ?? 0), 0);
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  return owed - paid;
}

/**
 * How much to collect for each open order, oldest first, never more than the customer's
 * real balance. Use it for rider/dispatch lists so unlinked payments are respected.
 */
export function amountsToCollect(orders: Order[], payments: Payment[]): Record<string, number> {
  let remaining = Math.max(0, customerBalance(orders, payments));
  const out: Record<string, number> = {};
  const open = orders
    .filter((o) => o.status !== "cancelled")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const o of open) {
    const due = Math.max(0, orderDue(o, payments));
    const amount = Math.min(due, remaining);
    out[o.id] = amount;
    remaining -= amount;
  }
  return out;
}
