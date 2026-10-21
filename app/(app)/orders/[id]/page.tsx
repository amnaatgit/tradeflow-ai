"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
  customer_id: string | null;
  customers: { id?: string; name: string | null; phone: string | null } | null;
  order_items: { id?: string; name: string; qty: number; unit_price: number }[];
};

function formatMoney(n: number) {
  return "Rs " + n.toLocaleString("en-IN");
}

export default function OrderDetail() {
  const params = useParams();
  const id = params?.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [payments, setPayments] = useState<{ id: string; amount: number; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showCollectBox, setShowCollectBox] = useState(false);
  const [recordAmount, setRecordAmount] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setError(null);
    setActionError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const [ordRes, payRes] = await Promise.all([
        supabase
          .from("orders")
          .select(
            `id,created_at,status,raw_text,address,area,advance,customer_id,customers(id,name,phone),order_items(id,name,qty,unit_price)`
          )
          .eq("id", id)
          .single(),
        supabase
          .from("payments")
          .select("id,amount,created_at")
          .eq("order_id", id)
          .order("created_at", { ascending: true }),
      ]);

      if (ordRes.error) throw ordRes.error;
      setOrder(ordRes.data as unknown as Order);
      if (payRes.error) throw payRes.error;
      setPayments((payRes.data || []) as any);
    } catch (e) {
      setError((e as any)?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    if (!id) return;
    (async () => {
      if (!mounted) return;
      await load();
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function updateStatus(newStatus: string) {
    setSaving(true);
    setActionError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
      await load();
    } catch (e) {
      setActionError((e as any)?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  async function recordPayment(amountNum: number) {
    setSaving(true);
    setActionError(null);
    try {
      if (!order) throw new Error("Order not loaded");
      if (!amountNum || amountNum <= 0) throw new Error("Enter an amount above 0");
      const supabase = createClient();
      const { error } = await supabase
        .from("payments")
        .insert({ customer_id: order.customer_id, order_id: order.id, amount: amountNum });
      if (error) throw error;
      setMessage("Payment recorded.");
      setRecordAmount("");
      setTimeout(() => setMessage(null), 3000);
      await load();
      return true;
    } catch (e) {
      setActionError((e as any)?.message ?? String(e));
      return false;
    } finally {
      setSaving(false);
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

  if (!order)
    return (
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
  const paid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const due = balanceDue(total, advance, paid);

  const statusBg = order.status === "pending" ? "#FEF3C7" : order.status === "delivered" ? "#DCFCE7" : "#E5E7EB";
  const statusColor = order.status === "pending" ? "#92400E" : order.status === "delivered" ? "#065F46" : "#374151";

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            Order
            <span
              className="ml-2 inline-flex items-center px-2 py-1 rounded text-xs font-medium"
              style={{ background: statusBg, color: statusColor }}
            >
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2">
            <div className="flex justify-between">
              <div>
                <div className="font-medium">{order.customers?.name || order.customers?.phone || "Unknown customer"}</div>
                <div className="text-sm text-muted-foreground">{order.customers?.phone || "-"}</div>
                {order.customer_id && (
                  <div className="text-sm"><Link href={`/khata/${order.customer_id}`}>View khata</Link></div>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">{order.area || "No area"}</div>
                <div className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</div>
              </div>
            </div>

            <div className="text-sm">
              <span className="text-muted-foreground">Deliver to: </span>
              {order.address || "No address"}
            </div>

            {order.raw_text && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Original message</div>
                <div className="whitespace-pre-wrap text-sm text-muted-foreground p-2 bg-gray-50 rounded">{order.raw_text}</div>
              </div>
            )}

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
              <div className="text-sm">Paid: {formatMoney(paid)}</div>
              <div className="text-lg font-medium">
                {order.status === "cancelled"
                  ? "Cancelled, nothing to collect"
                  : due < 0
                  ? `Customer overpaid ${formatMoney(Math.abs(due))}`
                  : `Amount due: ${formatMoney(due)}`}
              </div>
            </div>

            <div className="pt-2">
              <div className="text-sm font-medium">Payments</div>
              <div className="space-y-2">
                {payments.length === 0 && <div className="text-sm text-muted-foreground">No payments yet</div>}
                {payments.map((p) => (
                  <div key={p.id} className="flex justify-between text-sm">
                    <div className="text-muted-foreground">{new Date(p.created_at).toLocaleString()}</div>
                    <div>{formatMoney(p.amount)}</div>
                  </div>
                ))}
              </div>
            </div>

            {actionError && <p className="text-sm text-destructive">{actionError}</p>}
            {message && <p className="text-sm text-green-700">{message}</p>}

            {/* Record payment */}
            {order.status !== "cancelled" && (
              <div className="pt-2">
                <div className="text-sm font-medium">Record payment</div>
                <div className="flex gap-2 items-center mt-2">
                  <input
                    value={recordAmount}
                    onChange={(e) => setRecordAmount(e.target.value)}
                    inputMode="decimal"
                    className="border rounded px-2 py-1"
                    placeholder={due > 0 ? String(due) : "Amount"}
                  />
                  <Button
                    onClick={() => {
                      const n = Number(recordAmount || (due > 0 ? String(due) : "0"));
                      recordPayment(n);
                    }}
                    disabled={saving}
                  >
                    Record payment
                  </Button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-4">
              {order.status === "pending" && (
                <>
                  <div>
                    {!showCollectBox && (
                      <Button onClick={() => setShowCollectBox(true)} disabled={saving}>
                        Mark delivered
                      </Button>
                    )}
                    {showCollectBox && (
                      <div className="p-2 bg-muted rounded">
                        <div className="text-sm">{due > 0 ? `${formatMoney(due)} is still due. Did you collect it?` : "Mark order delivered?"}</div>
                        <div className="flex gap-2 pt-2">
                          {due > 0 && (
                            <Button
                              onClick={async () => {
                                setSaving(true);
                                try {
                                  const ok = await recordPayment(due);
                                  if (ok) await updateStatus("delivered");
                                  setShowCollectBox(false);
                                } catch (e) {
                                  setActionError((e as any)?.message ?? String(e));
                                } finally {
                                  setSaving(false);
                                }
                              }}
                              disabled={saving}
                            >
                              Collected {formatMoney(due)} cash
                            </Button>
                          )}
                          <Button
                            onClick={async () => {
                              setSaving(true);
                              try {
                                await updateStatus("delivered");
                                setShowCollectBox(false);
                              } finally {
                                setSaving(false);
                              }
                            }}
                            disabled={saving}
                          >
                            Delivered, still owed
                          </Button>
                          <Button variant="ghost" onClick={() => setShowCollectBox(false)}>
                            Back
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    {!showCancelConfirm && (
                      <Button variant="destructive" onClick={() => setShowCancelConfirm(true)} disabled={saving}>
                        Cancel order
                      </Button>
                    )}
                    {showCancelConfirm && (
                      <div className="p-2 bg-muted rounded">
                        <div className="text-sm">Are you sure you want to cancel?</div>
                        <div className="flex gap-2 pt-2">
                          <Button variant="ghost" onClick={() => setShowCancelConfirm(false)}>
                            No, keep
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={async () => {
                              setSaving(true);
                              try {
                                await updateStatus("cancelled");
                                setShowCancelConfirm(false);
                              } catch (e) {
                                setActionError((e as any)?.message ?? String(e));
                              } finally {
                                setSaving(false);
                              }
                            }}
                          >
                            Yes, cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {order.status === "delivered" && (
                <Button onClick={() => updateStatus("pending")} disabled={saving}>
                  Move back to pending
                </Button>
              )}

              {order.status === "cancelled" && (
                <Button onClick={() => updateStatus("pending")} disabled={saving}>
                  Restore order
                </Button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <Link href="/orders">
                  <Button variant="ghost">Back to orders</Button>
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
