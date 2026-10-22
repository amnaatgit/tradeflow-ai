"use client";

import React from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { totalFromItems } from "@/lib/calc";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type OrderRow = {
  id: string;
  created_at: string;
  status: string;
  area: string | null;
  customers: { name?: string | null; phone?: string | null } | null;
  order_items: { qty: number; unit_price: number }[];
};

function formatMoney(n: number) {
  return "Rs " + n.toLocaleString("en-IN");
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "delivered" | "cancelled">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const supabase = createClient();
    (async () => {
      try {
        const res = await supabase
          .from("orders")
          .select(`id,created_at,status,area,customers(name,phone),order_items(qty,unit_price)`)
          .order("created_at", { ascending: false });
        if (!mounted) return;
        if (res.error) {
          setError(res.error.message);
          setOrders([]);
        } else {
          setOrders(res.data as unknown as OrderRow[]);
        }
      } catch (err) {
        if (!mounted) return;
        setError(String(err));
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-9 w-24" />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Skeleton className="h-9 w-full max-w-xs" />
              <div className="flex gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-20 rounded-full" />
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex flex-1 items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );

  const filtered = (orders || []).filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    const name = o.customers?.name || o.customers?.phone || "Unknown customer";
    return (
      name.toLowerCase().includes(s) ||
      (o.customers?.phone || "").includes(s) ||
      (o.area || "").toLowerCase().includes(s)
    );
  });

  if (error)
    return (
      <Card className="m-4">
        <CardHeader>
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error: {error}</p>
        </CardContent>
      </Card>
    );

  if (!orders || orders.length === 0)
    return (
      <Card className="m-4">
        <CardHeader>
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">No orders yet.</p>
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Your orders</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Track recent orders and their status in one place.
              </p>
            </div>
            <Link href="/orders/new">
              <Button size="sm">New order</Button>
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              className="min-w-[160px] flex-1 rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              placeholder="Search name, phone or area"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex flex-wrap gap-1">
              {(["all", "pending", "delivered", "cancelled"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    statusFilter === s
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {s[0].toUpperCase() + s.slice(1)} (
                  {s === "all" ? orders.length : orders.filter((o) => o.status === s).length})
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No orders match.
              <button
                type="button"
                className="ml-1 text-primary underline underline-offset-2"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
              >
                Clear filters
              </button>
            </div>
          )}
          <div className="divide-y">
            {filtered.map((o) => {
              const customer = o.customers?.name ?? o.customers?.phone ?? "Unknown customer";
              const initial = customer.trim().charAt(0).toUpperCase();
              const total = totalFromItems(o.order_items || []);
              const date = formatDateTime(o.created_at);
              const statusLabel = o.status.charAt(0).toUpperCase() + o.status.slice(1);

              const statusColor =
                o.status === "pending"
                  ? "bg-amber-100 text-amber-800 ring-amber-200"
                  : o.status === "delivered"
                  ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
                  : "bg-slate-100 text-slate-700 ring-slate-200";

              const rowClass = o.status === "cancelled" ? "opacity-60 line-through" : "";

              return (
                <Link
                  key={o.id}
                  href={`/orders/${o.id}`}
                  className={cn(
                    "block px-3 py-3 transition-colors hover:bg-muted/60",
                    rowClass
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-1 items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{customer}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {o.area || "No area"}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-right text-xs sm:text-sm">
                      <div className="font-semibold tabular-nums">{formatMoney(total)}</div>
                      <div className="flex flex-wrap items-center justify-end gap-2 text-[11px] text-muted-foreground">
                        <span className="whitespace-nowrap">{date}</span>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                            statusColor
                          )}
                        >
                          {statusLabel}
                        </span>
                      </div>
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
