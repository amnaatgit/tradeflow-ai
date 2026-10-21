"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { totalFromItems, customerBalance } from "@/lib/calc";
import { cn } from "@/lib/utils";

type LatestOrder = {
  id: string;
  created_at: string;
  status: string;
  area: string | null;
  customers: { name: string | null; phone: string | null } | null;
  order_items: { qty: number; unit_price: number }[];
};

function formatMoney(n: number) {
  return "Rs " + n.toLocaleString("en-IN");
}

const badge: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-gray-200 text-gray-700",
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayCount, setTodayCount] = useState(0);
  const [todaySales, setTodaySales] = useState(0);
  const [toDispatch, setToDispatch] = useState(0);
  const [toCollect, setToCollect] = useState(0);
  const [topArea, setTopArea] = useState<string | null>(null);
  const [latest, setLatest] = useState<LatestOrder[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const supabase = createClient();
      const startOfToday = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      try {
        const [todayRes, pendingRes, customersRes, paymentsRes, areasRes, latestRes] = await Promise.all([
          supabase
            .from("orders")
            .select("id,status,order_items(qty,unit_price)")
            .gte("created_at", startOfToday)
            .neq("status", "cancelled"),
          supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase
            .from("customers")
            .select("id,orders(id,status,advance,order_items(qty,unit_price))"),
          supabase.from("payments").select("customer_id,amount"),
          supabase.from("orders").select("area").gte("created_at", thirtyDaysAgo).neq("status", "cancelled"),
          supabase
            .from("orders")
            .select("id,created_at,status,area,customers(name,phone),order_items(qty,unit_price)")
            .order("created_at", { ascending: false })
            .limit(5),
        ]);
        for (const r of [todayRes, pendingRes, customersRes, paymentsRes, areasRes, latestRes]) {
          if (r.error) throw r.error;
        }
        if (!mounted) return;

        const today = (todayRes.data || []) as unknown as { order_items: { qty: number; unit_price: number }[] }[];
        setTodayCount(today.length);
        setTodaySales(today.reduce((s, o) => s + totalFromItems(o.order_items || []), 0));
        setToDispatch(pendingRes.count ?? 0);

        const payments = paymentsRes.data || [];
        let collect = 0;
        for (const c of (customersRes.data || []) as unknown as { id: string; orders: unknown[] }[]) {
          const bal = customerBalance(
            c.orders || [],
            payments.filter((p) => p.customer_id === c.id)
          );
          if (bal > 0) collect += bal;
        }
        setToCollect(collect);

        const counts: Record<string, number> = {};
        for (const r of (areasRes.data || []) as { area: string | null }[]) {
          const a = r.area?.trim() || "No area";
          counts[a] = (counts[a] || 0) + 1;
        }
        const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
        setTopArea(top ? `${top[0]} (${top[1]})` : null);

        setLatest((latestRes.data || []) as unknown as LatestOrder[]);
      } catch (err) {
        if (mounted) setError((err as { message?: string })?.message ?? String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
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

  const stats = [
    { title: "Today's orders", value: String(todayCount), note: formatMoney(todaySales), href: "/orders" },
    { title: "To dispatch", value: String(toDispatch), note: "pending orders", href: "/dispatch" },
    { title: "To collect", value: formatMoney(toCollect), note: "from customers", href: "/khata" },
    { title: "Top area (30 days)", value: topArea ?? "—", note: "by orders", href: "/dispatch" },
  ];

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Link href="/orders/new">
          <Button>New order</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.title} href={s.href} className="block">
            <Card className="h-full transition-colors hover:bg-muted/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="truncate text-2xl font-semibold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.note}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latest orders</CardTitle>
        </CardHeader>
        <CardContent>
          {latest.length === 0 ? (
            <div className="p-4 text-center">
              <div className="mb-2 text-sm text-muted-foreground">
                No orders yet. Paste a customer&apos;s WhatsApp message to create your first one.
              </div>
              <Link href="/orders/new">
                <Button>New order</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {latest.map((o) => (
                <Link key={o.id} href={`/orders/${o.id}`} className="block py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {o.customers?.name || o.customers?.phone || "Unknown customer"}
                      </div>
                      <div className="text-sm text-muted-foreground">{o.area || "No area"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">{formatMoney(totalFromItems(o.order_items || []))}</div>
                      <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2 py-1 text-xs font-medium",
                        badge[o.status] ?? badge.cancelled
                      )}
                    >
                      {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
