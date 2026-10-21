export function totalFromItems(items: { qty: number; unit_price: number }[]) {
  return items.reduce((s, it) => s + (it.unit_price ?? 0) * it.qty, 0);
}

// Amount still to collect on an order: total minus advance minus payments.
export function balanceDue(total: number, advance: number, payments = 0) {
  return total - (advance || 0) - (payments || 0);
}

// Sum of non-cancelled order totals minus advances minus payments for a customer
export function customerBalance(orders: any[], payments: any[]) {
  const ordersTotal = (orders || []).reduce((s: number, o: any) => {
    if (o.status === "cancelled") return s;
    const total = totalFromItems(o.order_items || []);
    return s + (total - (o.advance || 0));
  }, 0);
  const paymentsTotal = (payments || []).reduce((s: number, p: any) => s + (p.amount || 0), 0);
  return ordersTotal - paymentsTotal;
}
