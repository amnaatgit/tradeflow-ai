"use client";

import { Truck as IcTruck } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { totalFromItems, balanceDue, customerBalance } from "@/lib/calc";

type Order = {
  id: string;
  created_at: string;
  customer_id: string | null;
  customers: { name: string | null; phone: string | null } | null;
  address: string | null;
  area: string | null;
  advance: number | null;
  order_items: { name: string; qty: number; unit_price: number }[];
  payments: { amount: number }[];
  status: string;
};

function formatMoney(n: number) {
  return "Rs " + n.toLocaleString("en-IN");
}

// What is still due on one order: total - advance - payments linked to it.
function orderDue(o: Order) {
  const paid = (o.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
  return Math.max(0, balanceDue(totalFromItems(o.order_items || []), o.advance || 0, paid));
}

// Cash the rider should collect per order. Payments recorded in the khata without an
// order reduce the customer's balance, so we never ask for more than that balance
// (spread over the customer's pending orders, oldest first).
function collectAmounts(orders: Order[], balances: Record<string, number>) {
  const remaining: Record<string, number> = { ...balances };
  const out: Record<string, number> = {};
  for (const o of [...orders].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const due = orderDue(o);
    const cid = o.customer_id;
    const left = cid && remaining[cid] !== undefined ? Math.max(0, remaining[cid]) : due;
    const amount = Math.min(due, left);
    if (cid && remaining[cid] !== undefined) remaining[cid] = left - amount;
    out[o.id] = amount;
  }
  return out;
}

export default function DispatchPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [todayOnly, setTodayOnly] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [balances, setBalances] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    const supabase = createClient();
    try {
      const res = await supabase
        .from("orders")
        .select(
          "id,created_at,status,customer_id,address,area,advance,customers(name,phone),order_items(name,qty,unit_price),payments(amount)"
        )
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (res.error) throw res.error;
      const rows = res.data as unknown as Order[];
      const ids = Array.from(new Set(rows.map((o) => o.customer_id).filter((x): x is string => !!x)));
      const next: Record<string, number> = {};
      if (ids.length) {
        const cRes = await supabase
          .from("customers")
          .select("id,orders(id,status,advance,order_items(qty,unit_price)),payments(amount)")
          .in("id", ids);
        if (cRes.error) throw cRes.error;
        for (const c of (cRes.data || []) as unknown as { id: string; orders: unknown[]; payments: unknown[] }[]) {
          next[c.id] = customerBalance(c.orders || [], c.payments || []);
        }
      }
      setBalances(next);
      setOrders(rows);
      setError(null);
    } catch (err) {
      setError((err as { message?: string })?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const collect = collectAmounts(orders || [], balances);

  async function markDelivered(o: Order, collectedCash: boolean) {
    setBusyId(o.id);
    setActionError(null);
    const supabase = createClient();
    const amount = collect[o.id] ?? 0;
    if (collectedCash && amount > 0) {
      const { error: payError } = await supabase
        .from("payments")
        .insert({ customer_id: o.customer_id, order_id: o.id, amount, method: "Cash" });
      if (payError) {
        setActionError(`Couldn't record the cash payment: ${payError.message}`);
        setBusyId(null);
        return;
      }
    }
    const { error: updateError } = await supabase.from("orders").update({ status: "delivered" }).eq("id", o.id);
    setBusyId(null);
    if (updateError) {
      setActionError(updateError.message);
      return;
    }
    setOrders((prev) => (prev ? prev.filter((x) => x.id !== o.id) : prev));
  }

  if (loading)
    return (
      <div className="space-y-3 p-4">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-3 w-40" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, groupIdx) => (
                <div key={groupIdx} className="rounded border p-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="mt-3 space-y-2">
                    {Array.from({ length: 2 }).map((__, i) => (
                      <div key={i} className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-48" />
                          <Skeleton className="h-3 w-36" />
                        </div>
                        <div className="space-y-2 text-right">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-8 w-32" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  if (error)
    return (
      <Card className="m-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2.5"><span aria-hidden className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 ring-1 ring-emerald-200"><IcTruck className="h-[18px] w-[18px] text-emerald-700" strokeWidth={2} /></span>Dispatch</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error: {error}</p>
        </CardContent>
      </Card>
    );

  const now = new Date();
  const filtered = (orders || []).filter((o) => {
    if (!todayOnly) return true;
    const d = new Date(o.created_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  });

  const groups = new Map<string, Order[]>();
  for (const o of filtered) {
    const key = o.area?.trim() || "No area";
    groups.set(key, [...(groups.get(key) || []), o]);
  }
  const sortedGroups = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const grandTotal = filtered.reduce((s, o) => s + (collect[o.id] ?? 0), 0);

  return (
    <div className="space-y-3 p-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2.5"><span aria-hidden className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 ring-1 ring-emerald-200"><IcTruck className="h-[18px] w-[18px] text-emerald-700" strokeWidth={2} /></span>Dispatch</CardTitle>
              <p className="text-sm text-muted-foreground">
                {filtered.length} pending {filtered.length === 1 ? "order" : "orders"} · cash to collect{" "}
                <span className="font-semibold text-foreground">{formatMoney(grandTotal)}</span>
              </p>
            </div>
            <div className="no-print flex items-center gap-2">
              <label className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-sm">
                <input
                  type="checkbox"
                  checked={todayOnly}
                  onChange={(e) => setTodayOnly(e.target.checked)}
                  className="accent-primary"
                />
                Only today&apos;s orders
              </label>
              <Button onClick={() => window.print()}>Print list</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {actionError && <p className="no-print mb-3 text-sm text-destructive">{actionError}</p>}
          {sortedGroups.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {todayOnly ? "No pending orders from today." : "Nothing to dispatch. All orders are delivered or cancelled."}
            </p>
          )}
          <div className="space-y-4">
            {sortedGroups.map(([area, items]) => {
              const groupTotal = items.reduce((s, o) => s + (collect[o.id] ?? 0), 0);
              return (
                <div key={area} className="rounded border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{area}</div>
                      <div className="text-sm text-muted-foreground">
                        {items.length} {items.length === 1 ? "order" : "orders"}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      Collect <span className="font-semibold">{formatMoney(groupTotal)}</span>
                    </div>
                  </div>
                  <div className="mt-3 divide-y">
                    {items.map((o) => {
                      const amt = collect[o.id] ?? 0;
                      return (
                        <div key={o.id} className="py-2">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium">
                                {o.customers?.name || "Unknown customer"}{" "}
                                <span className="text-sm text-muted-foreground">{o.customers?.phone || ""}</span>
                              </div>
                              <div className="text-sm text-muted-foreground">{o.address || "No address"}</div>
                              <div className="text-sm">
                                {(o.order_items || []).map((it) => `${it.qty}× ${it.name}`).join(", ")}
                              </div>
                              <Link href={`/orders/${o.id}`} className="no-print text-xs text-primary underline">
                                Open order
                              </Link>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold">
                                {amt > 0 ? `Collect ${formatMoney(amt)}` : "Fully paid"}
                              </div>
                              <div className="no-print flex flex-wrap justify-end gap-2 pt-1">
                                {amt > 0 ? (
                                  <>
                                    <Button size="sm" disabled={busyId === o.id} onClick={() => markDelivered(o, true)}>
                                      Delivered, cash collected
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={busyId === o.id}
                                      onClick={() => markDelivered(o, false)}
                                    >
                                      Delivered, still owed
                                    </Button>
                                  </>
                                ) : (
                                  <Button size="sm" disabled={busyId === o.id} onClick={() => markDelivered(o, false)}>
                                    Mark delivered
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
