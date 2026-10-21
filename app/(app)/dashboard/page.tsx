"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { totalFromItems, customerBalance } from "@/lib/calc";

function formatMoney(n: number) {
  return "Rs " + n.toLocaleString("en-IN");
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayOrdersCount, setTodayOrdersCount] = useState(0);
  const [totalPendingBalance, setTotalPendingBalance] = useState(0);
  const [topArea, setTopArea] = useState<string | null>(null);
  const [latestOrders, setLatestOrders] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const supabase = createClient();

    Promise.all([
      // orders today
      supabase
        .from("orders")
        .select("id,created_at")
        .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      // customers (with orders and order_items) + payments for balances
      supabase.from("customers").select("id,name,phone,area,orders(id,status,advance,order_items(qty,unit_price))"),
      supabase.from("payments").select("id,customer_id,amount"),
      // top area by orders in last 30 days
      supabase
        .from("orders")
        .select("area")
        .gte("created_at", new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString()),
      // latest 5 orders
      supabase
        .from("orders")
        .select("id,created_at,status,area,customers(name),order_items(qty,unit_price, name)")
        .order("created_at", { ascending: false })
        .limit(5),
    ])
      .then((results) => {
        if (!mounted) return;
        const [todayRes, customersRes, paymentsRes, areasRes, latestRes] = results;
        if (todayRes.error) throw todayRes.error;
        if (customersRes.error) throw customersRes.error;
        if (paymentsRes.error) throw paymentsRes.error;
        if (areasRes.error) throw areasRes.error;
        if (latestRes.error) throw latestRes.error;

        setTodayOrdersCount((todayRes.data || []).length);

        // total pending balance: sum of positive customer balances
        const customers = customersRes.data || [];
        const payments = paymentsRes.data || [];
        let totalPending = 0;
        for (const c of customers) {
          const custOrders = c.orders || [];
          const custPayments = payments.filter((p: any) => p.customer_id === c.id);
          const bal = customerBalance(custOrders, custPayments);
          if (bal > 0) totalPending += bal;
        }
        setTotalPendingBalance(totalPending);

        // top area by order count in last 30 days
        const areas = (areasRes.data || []).map((r: any) => r.area || "No area");
        const counts: Record<string, number> = {};
        for (const a of areas) counts[a] = (counts[a] || 0) + 1;
        let top: string | null = null;
        let topCount = 0;
        for (const k of Object.keys(counts)) {
          if (counts[k] > topCount) {
            topCount = counts[k];
            top = k;
          }
        }
        setTopArea(top);

        setLatestOrders(latestRes.data || []);
      })
      .catch((err) => {
        setError((err as any)?.message ?? String(err));
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <p className="p-4">Loading dashboard…</p>;
  if (error)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error: {error}</p>
        </CardContent>
      </Card>
    );

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Link href="/orders/new">
          <Button>New order</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Today's orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{todayOrdersCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total pending balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatMoney(totalPendingBalance)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top area (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg">{topArea ?? "—"}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latest orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {latestOrders.length === 0 ? (
              <div className="p-4 text-center">
                <div className="mb-2 text-sm text-muted-foreground">No orders yet</div>
                <Link href="/orders/new">
                  <Button>New order</Button>
                </Link>
              </div>
            ) : (
              latestOrders.map((o) => {
                const customer = o.customers?.name ?? "Unknown";
                const total = totalFromItems(o.order_items || []);
                const date = new Date(o.created_at).toLocaleString();
                const statusColor =
                  o.status === "pending"
                    ? "bg-yellow-200 text-yellow-800"
                    : o.status === "delivered"
                    ? "bg-green-200 text-green-800"
                    : "bg-gray-200 text-gray-800";
                return (
                  <Link key={o.id} href={`/orders/${o.id}`} className="block py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-medium">{customer}</div>
                        <div className="text-sm text-muted-foreground">{o.area || "No area"}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">{formatMoney(total)}</div>
                        <div className="text-xs text-muted-foreground">{date}</div>
                      </div>
                      <div>
                        <span className={"px-2 py-1 rounded-full text-xs font-medium " + statusColor}>
                          {o.status}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
