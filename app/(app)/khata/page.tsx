"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { customerBalance } from "@/lib/calc";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  name: string;
  phone: string | null;
  area: string | null;
  balance: number;
};

type Filter = "all" | "due" | "paid" | "credit";

function formatMoney(n: number) {
  return "Rs " + n.toLocaleString("en-IN");
}

export default function KhataPage() {
  const [customers, setCustomers] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const supabase = createClient();
      try {
        const [res, pRes] = await Promise.all([
          supabase
            .from("customers")
            .select("id,name,phone,area,orders(id,status,advance,order_items(qty,unit_price))"),
          supabase.from("payments").select("customer_id,amount"),
        ]);
        if (res.error) throw res.error;
        if (pRes.error) throw pRes.error;
        const payments = pRes.data || [];
        const rows: Row[] = ((res.data as unknown as (Row & { orders: unknown[] })[]) || []).map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          area: c.area,
          balance: customerBalance(
            c.orders || [],
            payments.filter((p) => p.customer_id === c.id)
          ),
        }));
        if (mounted) setCustomers(rows);
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

  if (loading) return <p className="p-4">Loading…</p>;
  if (error)
    return (
      <Card className="m-4">
        <CardHeader>
          <CardTitle>Khata</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error: {error}</p>
        </CardContent>
      </Card>
    );

  const all = customers || [];
  const matchesFilter = (c: Row) =>
    filter === "all" ||
    (filter === "due" && c.balance > 0) ||
    (filter === "paid" && c.balance === 0) ||
    (filter === "credit" && c.balance < 0);
  const q = query.trim().toLowerCase();
  const filtered = all
    .filter(matchesFilter)
    .filter((c) => !q || (c.name || "").toLowerCase().includes(q) || (c.phone || "").includes(q))
    .sort((a, b) => b.balance - a.balance);
  const totalDue = all.reduce((s, c) => s + (c.balance > 0 ? c.balance : 0), 0);

  const chips: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: all.length },
    { key: "due", label: "Owes money", count: all.filter((c) => c.balance > 0).length },
    { key: "paid", label: "All paid", count: all.filter((c) => c.balance === 0).length },
    { key: "credit", label: "Credit", count: all.filter((c) => c.balance < 0).length },
  ];

  if (all.length === 0)
    return (
      <Card className="m-4">
        <CardHeader>
          <CardTitle>Khata</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            No customers yet. Customers are added automatically when you save an order.
          </p>
          <Link href="/orders/new">
            <Button>New order</Button>
          </Link>
        </CardContent>
      </Card>
    );

  return (
    <div className="space-y-3 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Khata</CardTitle>
          <p className="text-sm text-muted-foreground">
            Total to collect: <span className="font-semibold text-foreground">{formatMoney(totalDue)}</span>
          </p>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or phone"
              className="min-w-[180px] flex-1 rounded border px-3 py-2"
            />
            <div className="flex flex-wrap gap-1">
              {chips.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setFilter(c.key)}
                  className={cn(
                    "rounded px-2 py-1 text-sm",
                    filter === c.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  {c.label} ({c.count})
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y">
            {filtered.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No customers match.{" "}
                <button
                  type="button"
                  className="text-primary underline"
                  onClick={() => {
                    setQuery("");
                    setFilter("all");
                  }}
                >
                  Clear
                </button>
              </div>
            )}
            {filtered.map((c) => (
              <Link key={c.id} href={`/khata/${c.id}`} className="block p-3 hover:bg-muted/50">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {c.phone || "No phone"}
                      {c.area ? ` · ${c.area}` : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    {c.balance > 0 && <div className="font-semibold text-red-700">{formatMoney(c.balance)}</div>}
                    {c.balance === 0 && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">All paid</span>
                    )}
                    {c.balance < 0 && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                        Credit {formatMoney(Math.abs(c.balance))}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
