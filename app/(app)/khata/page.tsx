"use client";

import { BookOpen as IcBookOpen } from "lucide-react";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
        const rows: Row[] = ((res.data as unknown as (Row & { orders: unknown[] })[]) || []).map(
          (c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            area: c.area,
            balance: customerBalance(
              (c as any).orders || [],
              payments.filter((p) => p.customer_id === c.id)
            ),
          })
        );
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

  if (loading)
    return (
      <div className="space-y-3 p-4">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-3 w-40" />
              </div>
              <div className="flex gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-20 rounded-full" />
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Skeleton className="h-9 w-full max-w-xs" />
            </div>
            <div className="divide-y">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex flex-1 items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-20" />
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
          <CardTitle className="flex items-center gap-2.5"><span aria-hidden className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 ring-1 ring-emerald-200"><IcBookOpen className="h-[18px] w-[18px] text-emerald-700" strokeWidth={2} /></span>Khata</CardTitle>
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
          <CardTitle className="flex items-center gap-2.5"><span aria-hidden className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 ring-1 ring-emerald-200"><IcBookOpen className="h-[18px] w-[18px] text-emerald-700" strokeWidth={2} /></span>Khata</CardTitle>
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2.5"><span aria-hidden className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 ring-1 ring-emerald-200"><IcBookOpen className="h-[18px] w-[18px] text-emerald-700" strokeWidth={2} /></span>Khata</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Total to collect:{" "}
                <span className="font-semibold tabular-nums">{formatMoney(totalDue)}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {chips.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setFilter(c.key)}
                  className={cn(
                    "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    filter === c.key
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {c.label} ({c.count})
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or phone"
              className="min-w-[180px] flex-1 rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          </div>
          <div className="divide-y">
            {filtered.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No customers match.
                <button
                  type="button"
                  className="ml-1 text-primary underline underline-offset-2"
                  onClick={() => {
                    setQuery("");
                    setFilter("all");
                  }}
                >
                  Clear
                </button>
              </div>
            )}
            {filtered.map((c) => {
              const name = c.name || c.phone || "Unknown customer";
              const initial = name.trim().charAt(0).toUpperCase();

              return (
                <Link
                  key={c.id}
                  href={`/khata/${c.id}`}
                  className="block rounded-md px-3 py-3 transition-colors hover:bg-muted/60"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-1 items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{name}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {c.phone || "No phone"}
                          {c.area ? ` · ${c.area}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-right text-xs sm:text-sm">
                      {c.balance > 0 && (
                        <div className="font-semibold text-red-700 tabular-nums">
                          {formatMoney(c.balance)}
                        </div>
                      )}
                      {c.balance === 0 && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 ring-1 ring-inset ring-emerald-100">
                          All paid
                        </span>
                      )}
                      {c.balance < 0 && (
                        <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-800 ring-1 ring-inset ring-sky-100">
                          Credit <span className="tabular-nums">{formatMoney(Math.abs(c.balance))}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
