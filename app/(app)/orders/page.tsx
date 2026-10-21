"use client";

import React from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { totalFromItems } from "@/lib/calc";
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
  const [statusFilter, setStatusFilter] = useState<"all"|"pending"|"delivered"|"cancelled">("all");
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

  if (loading) return <p className="p-4">Loading orders…</p>;
  const filtered = (orders || []).filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    const name = o.customers?.name || o.customers?.phone || "Unknown customer";
    return name.toLowerCase().includes(s) || (o.customers?.phone || "").includes(s) || (o.area||"").toLowerCase().includes(s);
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
    <div className="p-4 space-y-3">
      <Card>
        <CardHeader>
          <CardTitle>Your orders</CardTitle>
          <div className="mt-2 flex flex-wrap gap-2 items-center">
            <input className="border p-1 rounded flex-1 min-w-[160px]" placeholder="Search name or phone" value={search} onChange={(e)=>setSearch(e.target.value)} />
            <div className="flex gap-1 flex-wrap">
              {(["all","pending","delivered","cancelled"] as const).map(s => (
                <button key={s} onClick={()=>setStatusFilter(s)} className={cn("px-2 py-1 rounded text-sm flex items-center", statusFilter===s?"bg-primary text-white":"bg-muted text-muted-foreground")}>
                  {s[0].toUpperCase()+s.slice(1)} ({s==='all' ? orders.length : orders.filter(o=>o.status===s).length})
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No orders match.{" "}
              <button type="button" className="text-primary underline" onClick={() => { setSearch(""); setStatusFilter("all"); }}>
                Clear
              </button>
            </div>
          )}
          <div className="divide-y">
            {filtered.map((o) => {
              const customer = o.customers?.name ?? o.customers?.phone ?? "Unknown customer";
              const total = totalFromItems(o.order_items || []);
              const date = new Date(o.created_at).toLocaleString();
              const statusColor =
                o.status === "pending"
                  ? "bg-yellow-200 text-yellow-800"
                  : o.status === "delivered"
                  ? "bg-green-200 text-green-800"
                  : "bg-gray-200 text-gray-800";
              const rowClass = o.status === 'cancelled' ? 'opacity-60 line-through' : '';
              return (
                <Link key={o.id} href={`/orders/${o.id}`} className={`block py-3 ${rowClass}`}>
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
                      <span className={cn("px-2 py-1 rounded-full text-xs font-medium", statusColor)}>
                        {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                      </span>
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
