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
  customers: { name: string } | null;
  order_items: { qty: number; unit_price: number }[];
};

function formatMoney(n: number) {
  return "Rs " + n.toLocaleString("en-IN");
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const supabase = createClient();
    supabase
      .from("orders")
      .select(`id,created_at,status,area,customers(name),order_items(qty,unit_price)`)
      .order("created_at", { ascending: false })
      .then((res) => {
        if (!mounted) return;
        if (res.error) {
          setError(res.error.message);
          setOrders([]);
        } else {
          setOrders(res.data as OrderRow[]);
        }
      })
      .catch((err) => setError(String(err)))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <p className="p-4">Loading orders…</p>;
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
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {orders.map((o) => {
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
                      <span className={cn("px-2 py-1 rounded-full text-xs font-medium", statusColor)}>
                        {o.status}
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
