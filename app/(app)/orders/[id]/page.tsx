"use client";

import { ClipboardList as IcClipboardList } from "lucide-react";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { totalFromItems, balanceDue } from "@/lib/calc";
import { formatDateTime } from "@/lib/format";

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
  const [payments, setPayments] = useState<{
    id: string;
    amount: number;
    created_at: string;
  }[]>([]);
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
            "id,created_at,status,raw_text,address,area,advance,customer_id,customers(id,name,phone),order_items(id,name,qty,unit_price)"
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
      setError((e as { message?: string })?.message ?? String(e));
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
      setActionError((e as { message?: string })?.message ?? String(e));
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
      setActionError((e as { message?: string })?.message ?? String(e));
      return false;
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="space-y-4 p-4">
        <Card>
          <CardHeader className="border-b pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="space-y-2 text-right">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-36" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
            <div className="flex flex-col gap-4 sm:flex-row">
              <Skeleton className="h-28 w-full sm:w-1/2" />
              <Skeleton className="h-28 w-full sm:w-1/2" />
            </div>
          </CardContent>
        </Card>
      </div>
    );

  if (error)
    return (
      <Card className="m-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2.5"><span aria-hidden className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 ring-1 ring-emerald-200"><IcClipboardList className="h-[18px] w-[18px] text-emerald-700" strokeWidth={2} /></span>Order</CardTitle>
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
          <CardTitle className="flex items-center gap-2.5"><span aria-hidden className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 ring-1 ring-emerald-200"><IcClipboardList className="h-[18px] w-[18px] text-emerald-700" strokeWidth={2} /></span>Order not found</CardTitle>
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

  const customerName = order.customers?.name || order.customers?.phone || "Unknown customer";
  const statusLabel = order.status.charAt(0).toUpperCase() + order.status.slice(1);
  const statusColor =
    order.status === "pending"
      ? "bg-amber-100 text-amber-800 ring-amber-200"
      : order.status === "delivered"
      ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
      : "bg-slate-100 text-slate-700 ring-slate-200";

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader className="border-b pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold leading-tight">{customerName}</h2>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusColor}`}
                >
                  {statusLabel}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground sm:text-sm">
                <span>{order.customers?.phone || "No phone"}</span>
                {order.area && <span>· {order.area}</span>}
                <span>· {formatDateTime(order.created_at)}</span>
              </div>
            </div>
            <div className="flex flex-col items-start gap-2 text-xs sm:items-end sm:text-sm">
              {order.customer_id && (
                <Link href={`/khata/${order.customer_id}`}>
                  <Button variant="outline" size="sm">
                    View khata
                  </Button>
                </Link>
              )}
              <span className="rounded-full border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                Order ID: <span className="tabular-nums">{order.id}</span>
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <div className="text-sm leading-relaxed">
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Delivery details
              </div>
              <p className="mt-1 text-sm text-foreground">
                <span className="font-medium text-muted-foreground">Deliver to:</span>{" "}
                {order.address || "No address"}
              </p>
            </div>
          </div>

          {order.raw_text && (
            <div className="space-y-1 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Original message
              </div>
              <div className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
                {order.raw_text}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Items</span>
              <span className="tabular-nums">{items.length} line{items.length === 1 ? "" : "s"}</span>
            </div>
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-right tabular-nums">Qty</th>
                    <th className="px-3 py-2 text-right tabular-nums">Unit</th>
                    <th className="px-3 py-2 text-right tabular-nums">Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-3 py-2 align-top">{it.name}</td>
                      <td className="px-3 py-2 text-right align-top tabular-nums">{it.qty}</td>
                      <td className="px-3 py-2 text-right align-top tabular-nums">{formatMoney(it.unit_price)}</td>
                      <td className="px-3 py-2 text-right align-top tabular-nums">
                        {formatMoney(it.unit_price * it.qty)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-2">
            <div className="ml-auto max-w-xs rounded-lg bg-muted/40 p-4 text-sm">
              <dl className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Total</dt>
                  <dd className="font-medium tabular-nums">{formatMoney(total)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Advance</dt>
                  <dd className="tabular-nums">{formatMoney(advance)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Paid</dt>
                  <dd className="tabular-nums">{formatMoney(paid)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Due</dt>
                  <dd className="font-semibold text-primary tabular-nums">{formatMoney(due)}</dd>
                </div>
              </dl>
            </div>
            <div className="text-right text-xs text-muted-foreground sm:text-sm">
              {order.status === "cancelled" ? (
                <span>Cancelled, nothing to collect.</span>
              ) : due < 0 ? (
                <span>
                  Customer overpaid {formatMoney(Math.abs(due))}.
                </span>
              ) : (
                <span>
                  Amount due: <span className="font-medium tabular-nums">{formatMoney(due)}</span>
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Payments</div>
            <div className="rounded-md border bg-muted/20 p-3">
              {payments.length === 0 && (
                <div className="text-sm text-muted-foreground">No payments yet.</div>
              )}
              <div className="divide-y">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2 text-sm">
                    <div className="text-xs text-muted-foreground sm:text-sm">
                      {formatDateTime(p.created_at)}
                    </div>
                    <div className="font-medium tabular-nums">{formatMoney(p.amount)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {actionError && <p className="text-sm text-destructive">{actionError}</p>}
          {message && <p className="text-sm text-emerald-700">{message}</p>}

          {order.status !== "cancelled" && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Record payment</div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={recordAmount}
                  onChange={(e) => setRecordAmount(e.target.value)}
                  inputMode="decimal"
                  className="w-full flex-1 rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  placeholder={due > 0 ? String(due) : "Amount"}
                />
                <Button
                  onClick={() => {
                    const fallback = due > 0 ? String(due) : "0";
                    const n = Number(recordAmount || fallback);
                    void recordPayment(n);
                  }}
                  disabled={saving}
                >
                  Record payment
                </Button>
              </div>
            </div>
          )}

          <div className="mt-4 border-t pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {order.status === "pending" && (
                  <>
                    <div>
                      {!showCollectBox && (
                        <Button onClick={() => setShowCollectBox(true)} disabled={saving}>
                          Mark delivered
                        </Button>
                      )}
                      {showCollectBox && (
                        <div className="mt-2 rounded-md bg-muted p-3 text-sm">
                          <div>
                            {due > 0
                              ? `${formatMoney(due)} is still due. Did you collect it?`
                              : "Mark order delivered?"}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {due > 0 && (
                              <Button
                                onClick={async () => {
                                  setSaving(true);
                                  try {
                                    const ok = await recordPayment(due);
                                    if (ok) await updateStatus("delivered");
                                    setShowCollectBox(false);
                                  } catch (e) {
                                    setActionError((e as { message?: string })?.message ?? String(e));
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
                        <Button
                          variant="destructive"
                          onClick={() => setShowCancelConfirm(true)}
                          disabled={saving}
                        >
                          Cancel order
                        </Button>
                      )}
                      {showCancelConfirm && (
                        <div className="mt-2 rounded-md bg-muted p-3 text-sm">
                          <div>Are you sure you want to cancel?</div>
                          <div className="mt-2 flex flex-wrap gap-2">
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
                                  setActionError((e as { message?: string })?.message ?? String(e));
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
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
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
