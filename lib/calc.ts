export function totalFromItems(items: { qty: number; unit_price: number }[]) {
  return items.reduce((s, it) => s + (it.unit_price ?? 0) * it.qty, 0);
}

// Amount still to collect on an order: total minus advance minus payments.
export function balanceDue(total: number, advance: number, payments = 0) {
  return total - (advance || 0) - (payments || 0);
}
