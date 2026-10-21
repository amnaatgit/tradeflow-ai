"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { totalFromItems, balanceDue } from "@/lib/calc";

type Order = {
  id: string;
  created_at: string;
  status: string;
  raw_text: string | null;
  address: string | null;
  area: string | null;
  advance: number | null;
  customers: { name: string | null; phone: string | null } | null;
  order_items: { id?: string; name: string; qty: number; unit_price: number }[];
};

function formatMoney(n: number) {
  return "Rs " + n.toLocaleString("en-IN");
}

import { useParams } from 'next/navigation';

export default function OrderDetail() {
  const params = useParams();
  const id = params?.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [paymentsSum, setPaymentsSum] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const supabase = createClient();
    Promise.all([
      supabase
        .from("orders")
        .select(
          `id,created_at,status,raw_text,address,area,advance,customers(name,phone),order_items(id,qty,unit_price,name)`
        )
        .eq("id", id)
        .single(),
      supabase.from('payments').select('amount').eq('order_id', id),
    ])
      .then(([res, pRes]) => {
        if (!mounted) return;
        if (res.error) {
          setError(res.error.message);
        } else if (!res.data) {
          setOrder(null);
        } else {
          setOrder(res.data as Order);
        }
        if (pRes.error) {
          throw pRes.error;
        } else {
          const sum = (pRes.data || []).reduce((s: number, p: any) => s + (p.amount || 0), 0);
          setPaymentsSum(sum);
        }
      })
      .catch((err) => setError((err as any)?.message ?? String(err)))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [id]);

  async function updateStatus(newStatus: string) {
    setUpdating(true);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", id);
    setUpdating(false);
    if (err) setError(err.message);
    else {
      // reload
      const { data, error: e2 } = await supabase
        .from("orders")
        .select(
          `id,created_at,status,raw_text,address,area,advance,customers(name,phone),order_items(id,qty,unit_price,name)`
        )
        .eq("id", id)
        .single();
      if (e2) setError(e2.message);
      else setOrder(data as Order);
    }
  }

  if (loading) return <p className="p-4">Loading order…</p>;
  if (error)
    return (
      <Card className="m-4">
        <CardHeader>
          <CardTitle>Order</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error: {error}</p>
          <Link href="/orders">
            <Button className="mt-4">Back to orders</Button>
          </Link>
        </CardContent>
      </Card>
    );

  if (!order) return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle>Order not found</CardTitle>
      </CardHeader>
      <CardContent>
        <p>That order does not exist.</p>
        <Link href="/orders">
          <Button className="mt-4">Back to orders</Button>
        </Link>
      </CardContent>
    </Card>
  );

  const items = order.order_items || [];
  const total = totalFromItems(items as any);
  const advance = order.advance || 0;
  const due = balanceDue(total, advance, paymentsSum);

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Order</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2">
            <div className="flex justify-between">
              <div>
                <div className="font-medium">{order.customers?.name || "Unknown"}</div>
                <div className="text-sm text-muted-foreground">{order.customers?.phone || "-"}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">{order.area || "No area"}</div>
                <div className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</div>
              </div>
            </div>
            <div className="whitespace-pre-wrap text-sm text-muted-foreground">{order.raw_text || "-"}</div>
            <div>
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th>Name</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th className="text-right">Line</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="py-2">{it.name}</td>
                      <td className="py-2">{it.qty}</td>
                      <td className="py-2">{formatMoney(it.unit_price)}</td>
                      <td className="py-2 text-right">{formatMoney(it.unit_price * it.qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pt-2 text-right">
              <div className="text-sm">Total: {formatMoney(total)}</div>
              <div className="text-sm">Advance: {formatMoney(advance)}</div>
              <div className="text-lg font-medium">Amount due: {formatMoney(due)}</div>
            </div>

            <div className="flex gap-2 pt-4">
              {order.status === "pending" && (
                <>
                  <Button onClick={() => updateStatus("delivered")} disabled={updating}>
                    Mark delivered
                  </Button>
                  <div>
                    {!confirmCancel && (
                      <Button variant="destructive" onClick={() => setConfirmCancel(true)}>
                        Cancel order
                      </Button>
                    )}
                    {confirmCancel && (
                      <div className="p-2 bg-muted rounded">
                        <div className="text-sm">Are you sure you want to cancel?</div>
                        <div className="flex gap-2 pt-2">
                          <Button variant="ghost" onClick={() => setConfirmCancel(false)}>
                            No, keep
                          </Button>
                          <Button variant="destructive" onClick={() => updateStatus("cancelled")}>
                            Yes, cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
              <div className="flex items-center gap-2">
                <Link href="/orders">
                  <Button variant="ghost">Back</Button>
                </Link>
                <Link href={`/orders/${id}/receipt`}>
                  <Button variant="outline">View receipt</Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
