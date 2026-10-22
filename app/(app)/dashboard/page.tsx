"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api";
import { totalFromItems, customerBalance } from "@/lib/calc";
import { cn } from "@/lib/utils";
import { MapPin, ShoppingBag, Truck, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type LatestOrder = {
  id: string;
  created_at: string;
  status: string;
  area: string | null;
  customers: { name: string | null; phone: string | null } | null;
  order_items: { qty: number; unit_price: number }[];
};

type Orders30dOrder = {
  order_items: { name: string | null; qty: number; unit_price: number }[];
};

type InsightSource = {
  orders30: number;
  sales30: number;
  pendingOrders: number;
  toCollect: number;
  topItems: { name: string; qty: number }[];
  topAreas: { area: string; orders: number }[];
  topDues: { name: string; due: number }[];
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
  const [insightsSource, setInsightsSource] = useState<InsightSource | null>(null);
  const [insightsLanguage, setInsightsLanguage] = useState<"roman_urdu" | "english">("roman_urdu");
  const [tips, setTips] = useState<string[]>([]);
  const [tipsError, setTipsError] = useState<string | null>(null);
  const [tipsLoading, setTipsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const supabase = createClient();
      const startOfToday = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      try {
        const [
          todayRes,
          pendingRes,
          customersRes,
          paymentsRes,
          areasRes,
          latestRes,
          orders30Res,
        ] = await Promise.all([
          supabase
            .from("orders")
            .select("id,status,order_items(qty,unit_price)")
            .gte("created_at", startOfToday)
            .neq("status", "cancelled"),
          supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase
            .from("customers")
            .select("id,name,orders(id,status,advance,order_items(qty,unit_price))"),
          supabase.from("payments").select("customer_id,amount"),
          supabase.from("orders").select("area").gte("created_at", thirtyDaysAgo).neq("status", "cancelled"),
          supabase
            .from("orders")
            .select("id,created_at,status,area,customers(name,phone),order_items(qty,unit_price)")
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("orders")
            .select("id,status,order_items(name,qty,unit_price)")
            .gte("created_at", thirtyDaysAgo)
            .neq("status", "cancelled"),
        ]);
        for (const r of [todayRes, pendingRes, customersRes, paymentsRes, areasRes, latestRes, orders30Res]) {
          if (r.error) throw r.error;
        }
        if (!mounted) return;

        const today = (todayRes.data || []) as unknown as { order_items: { qty: number; unit_price: number }[] }[];
        setTodayCount(today.length);
        setTodaySales(today.reduce((s, o) => s + totalFromItems(o.order_items || []), 0));
        setToDispatch(pendingRes.count ?? 0);

        const payments = paymentsRes.data || [];
        let collect = 0;
        const duesList: { name: string; due: number }[] = [];
        for (const c of (customersRes.data || []) as unknown as {
          id: string;
          name: string | null;
          orders: unknown[];
        }[]) {
          const bal = customerBalance(
            c.orders || [],
            payments.filter((p) => p.customer_id === c.id)
          );
          if (bal > 0) {
            collect += bal;
            const name = (c.name || "Customer").trim() || "Customer";
            duesList.push({ name, due: bal });
          }
        }
        setToCollect(collect);

        const counts: Record<string, number> = {};
        for (const r of (areasRes.data || []) as { area: string | null }[]) {
          const a = r.area?.trim() || "No area";
          counts[a] = (counts[a] || 0) + 1;
        }
        const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
        setTopArea(top ? `${top[0]} (${top[1]})` : null);

        const latestOrders = (latestRes.data || []) as unknown as LatestOrder[];
        setLatest(latestOrders);

        const orders30 = (orders30Res.data || []) as unknown as Orders30dOrder[];
        const orders30Count = orders30.length;
        const sales30 = orders30.reduce((sum, o) => sum + totalFromItems(o.order_items || []), 0);

        const itemCounts: Record<string, number> = {};
        for (const o of orders30) {
          for (const it of o.order_items || []) {
            const name = (it.name || "").trim() || "Unnamed item";
            itemCounts[name] = (itemCounts[name] || 0) + it.qty;
          }
        }
        const topItems = Object.entries(itemCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, qty]) => ({ name, qty }));

        const topAreas = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([area, orders]) => ({ area, orders }));

        const topDues = duesList.sort((a, b) => b.due - a.due).slice(0, 3);

        setInsightsSource({
          orders30: orders30Count,
          sales30,
          pendingOrders: pendingRes.count ?? 0,
          toCollect: collect,
          topItems,
          topAreas,
          topDues,
        });
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

  async function fetchTips() {
    if (!insightsSource) return;
    setTipsLoading(true);
    setTipsError(null);
    try {
      const res = await apiFetch("/api/insights", {
        language: insightsLanguage,
        orders_30d: insightsSource.orders30,
        sales_30d: insightsSource.sales30,
        pending_orders: insightsSource.pendingOrders,
        to_collect: insightsSource.toCollect,
        top_items: insightsSource.topItems,
        top_areas: insightsSource.topAreas,
        top_dues: insightsSource.topDues,
      });
      const json = (await res.json().catch(() => ({}))) as { tips?: string[]; error?: string };
      if (!res.ok || !Array.isArray(json.tips)) {
        throw new Error(json.error || "Failed to get tips");
      }
      setTips(json.tips);
    } catch (err) {
      setTips([]);
      setTipsError((err as { message?: string })?.message ?? "Something went wrong");
    } finally {
      setTipsLoading(false);
    }
  }

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

  const stats: { title: string; value: string; note: string; href: string; icon: LucideIcon }[] = [
    { title: "Today&apos;s orders", value: String(todayCount), note: formatMoney(todaySales), href: "/orders", icon: ShoppingBag },
    { title: "To dispatch", value: String(toDispatch), note: "pending orders", href: "/dispatch", icon: Truck },
    { title: "To collect", value: formatMoney(toCollect), note: "from customers", href: "/khata", icon: Wallet },
    { title: "Top area (30 days)", value: topArea ?? "—", note: "by orders", href: "/dispatch", icon: MapPin },
  ];

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <Link href="/orders/new">
          <Button>New order</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.title} href={s.href} className="block">
            <Card className="h-full transition-colors hover:bg-muted/40">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <span className="rounded-lg bg-primary/10 p-2 text-primary">
                    <s.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {s.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="truncate text-2xl font-semibold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.note}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {latest.length > 0 && insightsSource && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">AI tips for your shop</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Language"
                value={insightsLanguage}
                onChange={(e) => setInsightsLanguage(e.target.value as "roman_urdu" | "english")}
                className="rounded-md border bg-background px-2 py-1 text-sm"
              >
                <option value="roman_urdu">Roman Urdu</option>
                <option value="english">English</option>
              </select>
              <Button
                type="button"
                size="sm"
                onClick={fetchTips}
                disabled={tipsLoading}
              >
                {tipsLoading ? "Thinking…" : tips.length ? "Refresh tips" : "Get AI tips"}
              </Button>
            </div>
            {tipsError && <p className="mt-2 text-sm text-destructive">{tipsError}</p>}
            {tips.length > 0 && (
              <>
                <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
                  {tips.map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ol>
                <p className="mt-2 text-xs text-muted-foreground">Written by AI from your numbers</p>
              </>
            )}
          </CardContent>
        </Card>
      )}

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
                      <div className="text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleString("en-PK", {
                          day: "numeric",
                          month: "short",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </div>
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
