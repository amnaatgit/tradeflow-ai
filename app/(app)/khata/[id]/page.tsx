"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { totalFromItems, customerBalance } from "@/lib/calc";
import { normalizePhone } from "@/lib/phone";
import { copyText } from "@/lib/clipboard";
import { toWhatsAppNumber } from "@/lib/whatsapp";
import { AiMessageBox } from "@/components/ai-message-box";
import { cn } from "@/lib/utils";

type Customer = { id: string; name: string; phone: string | null; area: string | null };
type OrderRow = {
  id: string;
  created_at: string;
  status: string;
  advance: number | null;
  order_items: { qty: number; unit_price: number }[];
};
type Payment = {
  id: string;
  created_at: string;
  amount: number;
  order_id: string | null;
  method: string | null;
};

const METHODS = ["Cash", "JazzCash", "Easypaisa", "Bank transfer"];

function formatMoney(n: number) {
  return "Rs " + n.toLocaleString("en-IN");
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const badge: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-gray-200 text-gray-700",
};

export default function CustomerPage() {
  const params = useParams();
  const id = params?.id as string | undefined;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // record payment form
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [orderId, setOrderId] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [orderTouched, setOrderTouched] = useState(false);

  // edit customer form
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editArea, setEditArea] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  // reminder
  const [copied, setCopied] = useState(false);
  const [copyFallback, setCopyFallback] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const supabase = createClient();
    try {
      const [cRes, oRes, pRes] = await Promise.all([
        supabase.from("customers").select("id,name,phone,area").eq("id", id).maybeSingle(),
        supabase
          .from("orders")
          .select("id,created_at,status,advance,order_items(qty,unit_price)")
          .eq("customer_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("payments")
          .select("id,created_at,amount,order_id,method")
          .eq("customer_id", id)
          .order("created_at", { ascending: false }),
      ]);
      if (cRes.error) throw cRes.error;
      if (oRes.error) throw oRes.error;
      if (pRes.error) throw pRes.error;
      setCustomer((cRes.data as Customer) ?? null);
      setOrders((oRes.data as unknown as OrderRow[]) ?? []);
      setPayments((pRes.data as Payment[]) ?? []);
      setError(null);
    } catch (err) {
      setError((err as { message?: string })?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Link new payments to the oldest order that still has money due, unless the seller picks otherwise.
  useEffect(() => {
    if (orderTouched || orderId) return;
    const paidByOrder: Record<string, number> = {};
    for (const p of payments) if (p.order_id) paidByOrder[p.order_id] = (paidByOrder[p.order_id] || 0) + (p.amount || 0);
    const open = [...orders]
      .filter((o) => o.status !== "cancelled")
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .find((o) => totalFromItems(o.order_items || []) - (o.advance || 0) - (paidByOrder[o.id] || 0) > 0);
    if (open) setOrderId(open.id);
  }, [orders, payments, orderTouched, orderId]);

  if (!id) return <p className="p-4">Invalid customer</p>;
  if (loading) return <p className="p-4">Loading…</p>;
  if (error)
    return (
      <Card className="m-4">
        <CardHeader>
          <CardTitle>Customer</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error: {error}</p>
          <Link href="/khata">
            <Button className="mt-4">Back to khata</Button>
          </Link>
        </CardContent>
      </Card>
    );
  if (!customer)
    return (
      <Card className="m-4">
        <CardHeader>
          <CardTitle>Customer not found</CardTitle>
        </CardHeader>
        <CardContent>
          <Link href="/khata">
            <Button>Back to khata</Button>
          </Link>
        </CardContent>
      </Card>
    );

  const balance = customerBalance(orders, payments);
  const openOrders = orders.filter((o) => o.status !== "cancelled");
  const orderDate = (oid: string | null) => {
    const o = orders.find((x) => x.id === oid);
    return o ? new Date(o.created_at).toLocaleDateString() : null;
  };

  const reminderText = `Assalam o Alaikum ${customer.name || ""}! Aap ka ${formatMoney(
    Math.max(balance, 0)
  )} ka balance baqi hai. Meherbani kar ke jald ada kar dein. Shukriya!`;
  const wa = customer.phone ? toWhatsAppNumber(customer.phone) : null;

  async function copyReminder() {
    const ok = await copyText(reminderText).catch(() => false);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCopyFallback(reminderText);
    }
  }

  async function recordPayment(e: React.FormEvent) {
    e.preventDefault();
    setPaymentError(null);
    setSuccess(null);
    const val = Number(amount);
    if (!amount.trim() || !Number.isFinite(val) || val <= 0) {
      setPaymentError("Enter an amount above 0");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("payments")
      .insert({ customer_id: id, order_id: orderId || null, amount: val, method });
    setSaving(false);
    if (insertError) {
      setPaymentError(insertError.message);
      return;
    }
    setAmount("");
    setOrderId("");
    setOrderTouched(false);
    setSuccess(`Payment of ${formatMoney(val)} recorded.`);
    setTimeout(() => setSuccess(null), 3000);
    await load();
  }

  function startEdit() {
    if (!customer) return;
    setEditName(customer.name || "");
    setEditPhone(customer.phone || "");
    setEditArea(customer.area || "");
    setEditError(null);
    setEditing(true);
  }

  async function saveCustomer(e: React.FormEvent) {
    e.preventDefault();
    setEditError(null);
    if (!editName.trim()) {
      setEditError("Name is required.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("customers")
      .update({
        name: editName.trim(),
        phone: normalizePhone(editPhone),
        area: editArea.trim() || null,
      })
      .eq("id", id);
    setSaving(false);
    if (updateError) {
      setEditError(
        updateError.code === "23505" || /duplicate/i.test(updateError.message)
          ? "Another customer already uses this phone."
          : updateError.message
      );
      return;
    }
    setEditing(false);
    await load();
  }

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>{customer.name}</CardTitle>
        </CardHeader>
        <CardContent>
          {!editing ? (
            <>
              <div className="text-sm text-muted-foreground">{customer.phone || "No phone"}</div>
              <div className="text-sm text-muted-foreground">{customer.area || "No area"}</div>
              <div
                className={cn(
                  "mt-3 text-lg font-semibold",
                  balance > 0 ? "text-red-700" : balance < 0 ? "text-blue-700" : "text-green-700"
                )}
              >
                {balance > 0
                  ? `Balance due ${formatMoney(balance)}`
                  : balance === 0
                  ? "All paid"
                  : `Customer has ${formatMoney(Math.abs(balance))} credit`}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {balance > 0 && (
                  <>
                    <Button onClick={copyReminder}>{copied ? "Copied" : "Copy reminder"}</Button>
                    {wa && (
                      <a
                        href={`https://wa.me/${wa}?text=${encodeURIComponent(reminderText)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button variant="outline">Open WhatsApp</Button>
                      </a>
                    )}
                  </>
                )}
                <Button variant="outline" onClick={startEdit}>
                  Edit customer
                </Button>
                <Link href="/khata">
                  <Button variant="ghost">Back</Button>
                </Link>
              </div>
              {copyFallback && (
                <div className="mt-3">
                  <p className="text-sm">Copy failed. You can copy it manually:</p>
                  <textarea readOnly value={copyFallback} className="mt-2 h-28 w-full rounded border p-2 text-sm" />
                </div>
              )}
              {balance > 0 && (
                <div className="mt-4">
                  <AiMessageBox
                    kind="reminder"
                    title="Payment reminder (AI)"
                    phone={customer.phone}
                    payload={{ customer_name: customer.name, due: balance }}
                    fallbackText={reminderText}
                  />
                </div>
              )}
            </>
          ) : (
            <form onSubmit={saveCustomer} className="space-y-3">
              <div>
                <label className="text-sm" htmlFor="edit-name">Name</label>
                <input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 block w-full rounded border px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm" htmlFor="edit-phone">Phone</label>
                <input
                  id="edit-phone"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  inputMode="tel"
                  className="mt-1 block w-full rounded border px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm" htmlFor="edit-area">Area</label>
                <input
                  id="edit-area"
                  value={editArea}
                  onChange={(e) => setEditArea(e.target.value)}
                  className="mt-1 block w-full rounded border px-3 py-2"
                />
              </div>
              {editError && <p className="text-sm text-destructive">{editError}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {orders.length === 0 && <div className="p-2 text-sm text-muted-foreground">No orders</div>}
            {orders.map((o) => {
              const cancelled = o.status === "cancelled";
              return (
                <div key={o.id} className={cn("flex items-center justify-between gap-3 p-2", cancelled && "opacity-60")}>
                  <div>
                    <div className="font-medium">{new Date(o.created_at).toLocaleDateString()}</div>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", badge[o.status] ?? badge.cancelled)}>
                      {capitalise(o.status)}
                    </span>
                    {cancelled && <span className="ml-2 text-xs text-muted-foreground">(not counted)</span>}
                  </div>
                  <div className="text-right">
                    <div className={cn(cancelled && "line-through")}>{formatMoney(totalFromItems(o.order_items || []))}</div>
                    <div className="text-xs text-muted-foreground">Advance: {formatMoney(o.advance || 0)}</div>
                  </div>
                  <Link href={`/orders/${o.id}`} className="text-sm text-primary underline">
                    View
                  </Link>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {payments.length === 0 && <div className="p-2 text-sm text-muted-foreground">No payments yet</div>}
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-2">
                <div>
                  <div className="font-medium">{new Date(p.created_at).toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.method || "Method not recorded"}
                    {p.order_id && orderDate(p.order_id) ? ` · for order of ${orderDate(p.order_id)}` : ""}
                  </div>
                </div>
                <div className="font-medium">{formatMoney(p.amount || 0)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Record payment</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={recordPayment} className="space-y-3">
            <div>
              <label className="text-sm" htmlFor="pay-amount">Amount (Rs)</label>
              <input
                id="pay-amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 block w-full rounded border px-3 py-2"
                inputMode="decimal"
                placeholder={balance > 0 ? String(balance) : "Amount"}
              />
            </div>
            <div>
              <label className="text-sm" htmlFor="pay-method">Method</label>
              <select
                id="pay-method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="mt-1 block w-full rounded border px-3 py-2"
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm" htmlFor="pay-order">Apply to order (optional)</label>
              <select
                id="pay-order"
                value={orderId}
                onChange={(e) => {
                  setOrderId(e.target.value);
                  setOrderTouched(true);
                }}
                className="mt-1 block w-full rounded border px-3 py-2"
              >
                <option value="">Not linked to an order</option>
                {openOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {new Date(o.created_at).toLocaleDateString()} · {formatMoney(totalFromItems(o.order_items || []))} ·{" "}
                    {capitalise(o.status)}
                  </option>
                ))}
              </select>
            </div>
            {paymentError && <p className="text-sm text-destructive">{paymentError}</p>}
            {success && <p className="text-sm text-green-700">{success}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Record payment"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setAmount("");
                  setOrderId("");
                  setPaymentError(null);
                }}
              >
                Clear
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
