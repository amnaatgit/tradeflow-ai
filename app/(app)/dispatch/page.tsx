"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { totalFromItems, balanceDue } from "@/lib/calc";

type Order = {
  id: string;
  created_at: string;
  customers: { name: string | null; phone: string | null } | null;
  address: string | null;
  area: string | null;
  advance: number | null;
  order_items: { name: string; qty: number; unit_price: number }[];
  status: string;
};

function formatMoney(n: number) {
  return "Rs " + n.toLocaleString("en-IN");
}

export default function DispatchPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayOnly, setTodayOnly] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const supabase = createClient();
    let query = supabase
      .from("orders")
      .select(
        `id,created_at,status,address,area,advance,customers(name,phone),order_items(name,qty,unit_price)`
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    query
      .then((res) => {
        if (!mounted) return;
        if (res.error) {
          setError(res.error.message);
          setOrders([]);
        } else {
          setOrders(res.data as Order[]);
        }
      })
      .catch((err) => setError((err as any)?.message ?? String(err)))
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  async function markDelivered(id: string) {
    // optimistic update: remove from list
    setOrders((prev) => (prev ? prev.filter((o) => o.id !== id) : prev));
    const supabase = createClient();
    const { error } = await supabase.from("orders").update({ status: "delivered" }).eq("id", id);
    if (error) setError(error.message);
  }

  if (loading) return <p className="p-4">Loading dispatch…</p>;
  if (error)
    return (
      <Card className="m-4">
        <CardHeader>
          <CardTitle>Dispatch</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error: {error}</p>
        </CardContent>
      </Card>
    );

  const filtered = (orders || []).filter((o) => {
    if (!todayOnly) return true;
    const d = new Date(o.created_at);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  });

  // group by area
  const groups = new Map<string, Order[]>();
  filtered.forEach((o) => {
    const key = o.area || "No area";
    const arr = groups.get(key) || [];
    arr.push(o);
    groups.set(key, arr);
  });

  const totalGroups = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="p-4 space-y-3">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Dispatch</CardTitle>
            <div className="flex items-center gap-2">
              <Button className="no-print" onClick={() => window.print()}>
                Print
              </Button>
              <div className="rounded-md border bg-secondary px-2 py-1 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={todayOnly}
                    onChange={(e) => setTodayOnly(e.target.checked)}
                    className="accent-primary"
                  />
                  Today
                </label>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {totalGroups.length === 0 && <p>No pending orders.</p>}
          <div className="space-y-4">
            {totalGroups.map(([area, items]) => {
              const count = items.length;
              const groupTotal = items.reduce((s, it) => s + balanceDue(totalFromItems(it.order_items), it.advance || 0, 0), 0);
              return (
                <div key={area} className="border rounded p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{area}</div>
                      <div className="text-sm text-muted-foreground">{count} {count === 1 ? 'order' : 'orders'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">{formatMoney(groupTotal)}</div>
                    </div>
                  </div>

                  <div className="mt-3 divide-y">
                    {items.map((o) => {
                      const name = o.customers?.name || "Unknown";
                      const phone = o.customers?.phone || "-";
                      const amt = balanceDue(totalFromItems(o.order_items), o.advance || 0, 0);
                      return (
                        <div key={o.id} className="py-2">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="font-medium">{name} <span className="text-sm text-muted-foreground">{phone}</span></div>
                              <div className="text-sm text-muted-foreground">{o.address || "-"}</div>
                              <div className="text-sm">Items: {o.order_items.map((it) => `${it.qty}× ${it.name}`).join(", ")}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm">{formatMoney(amt)}</div>
                              <div className="pt-1 flex gap-2">
                                <Button className="no-print" size="sm" onClick={() => markDelivered(o.id)}>
                                  Mark delivered
                                </Button>
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
