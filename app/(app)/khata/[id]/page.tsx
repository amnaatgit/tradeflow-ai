"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { totalFromItems, customerBalance } from "@/lib/calc";
import { copyText } from '@/lib/clipboard';
import { toWhatsAppNumber } from '@/lib/whatsapp';

function formatMoney(n: number) {
  return "Rs " + n.toLocaleString("en-IN");
}

export default function CustomerPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [customer, setCustomer] = useState<any>(null);
  const [orders, setOrders] = useState<any[] | null>(null);
  const [payments, setPayments] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [orderId, setOrderId] = useState<string | "">("");
  const [copied, setCopied] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [copyFallback, setCopyFallback] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    const supabase = createClient();

    Promise.all([
      supabase.from("customers").select("*").eq("id", id).single(),
      supabase
        .from("orders")
        .select("*,order_items(*)")
        .eq("customer_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("payments").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
    ])
      .then(([cRes, oRes, pRes]) => {
        if (!mounted) return;
        if (cRes.error) throw cRes.error;
        if (oRes.error) throw oRes.error;
        if (pRes.error) throw pRes.error;
        setCustomer(cRes.data);
        setOrders(oRes.data as any[]);
        setPayments(pRes.data as any[]);
      })
      .catch((err) => setError((err as any)?.message ?? String(err)))
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [id]);

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
        </CardContent>
      </Card>
    );

  if (!customer) return <p className="p-4">Customer not found</p>;

  const balance = customerBalance(orders || [], payments || []);

  async function recordPayment(e: React.FormEvent) {
    e.preventDefault();
    const val = Number(amount);
    if (!val || val <= 0) return;
    const supabase = createClient();
    const res = await supabase.from("payments").insert({ customer_id: id, order_id: orderId || null, amount: val });
    if (res.error) {
      setPaymentError(res.error.message);
    } else {
      // reload payments and orders
      const [oRes, pRes] = await Promise.all([
        supabase
          .from("orders")
          .select("*,order_items(*)")
          .eq("customer_id", id)
          .order("created_at", { ascending: false }),
        supabase.from("payments").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
      ]);
      if (oRes.error) setPaymentError(oRes.error.message);
      else setOrders(oRes.data as any[]);
      if (pRes.error) setPaymentError(pRes.error.message);
      else setPayments(pRes.data as any[]);
      setAmount("");
      setOrderId("");
    }
  }

  async function copyReminder() {
    const text = `Assalam o Alaikum ${customer.name || ""}! Aap ka ${formatMoney(balance)} ka balance baqi hai. Meherbani kar ke jald ada kar dein. Shukriya!`;
    try {
      const ok = await copyText(text);
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        setCopyFallback(text);
      }
    } catch (e) {
      setCopyFallback(text);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{customer.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">{customer.phone}</div>
          <div className="text-sm text-muted-foreground">{customer.area}</div>
          <div className="mt-2 font-medium">Balance: {formatMoney(balance)}</div>
          <div className="mt-4 flex gap-2">
            <Button onClick={copyReminder}>{copied ? "Copied" : "Copy reminder"}</Button>
            {customer.phone && (() => {
              const wa = toWhatsAppNumber(customer.phone || '');
              if (!wa) return null;
              const txt = encodeURIComponent(`Assalam o Alaikum ${customer.name || ""}! Aap ka ${formatMoney(balance)} ka balance baqi hai. Meherbani kar ke jald ada kar dein. Shukriya!`);
              return (
                <a href={`https://wa.me/${wa}?text=${txt}`} target="_blank" rel="noreferrer">
                  <Button variant="outline">Open WhatsApp</Button>
                </a>
              );
            })()}
            <Link href="/khata">
              <Button variant="ghost">Back</Button>
            </Link>
          </div>
          {copyFallback && (
            <div className="mt-3">
              <p className="text-sm">Copy failed. You can copy manually:</p>
              <textarea readOnly value={copyFallback} className="w-full h-32 mt-2" />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {orders && orders.length === 0 && <div className="p-2 text-sm">No orders</div>}
            {orders?.map((o) => (
              <div key={o.id} className="p-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">{new Date(o.created_at).toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">{o.status}</div>
                </div>
                <div className="text-right">
                  <div>{formatMoney(totalFromItems(o.order_items || []))}</div>
                  <div className="text-sm text-muted-foreground">Advance: {formatMoney(o.advance || 0)}</div>
                </div>
                <Link href={`/orders/${o.id}`} className="text-sm text-primary underline">View</Link>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {payments && payments.length === 0 && <div className="p-2 text-sm">No payments</div>}
            {payments?.map((p) => (
              <div key={p.id} className="p-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">{new Date(p.created_at).toLocaleString()}</div>
                  {p.order_id && (
                    <div className="text-sm text-muted-foreground">Order: {p.order_id ? new Date(((orders || []).find((o: any) => o.id === p.order_id) || {}).created_at).toLocaleDateString() : ''}</div>
                  )}
                </div>
                <div>{formatMoney(p.amount || 0)}</div>
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
          <form onSubmit={recordPayment} className="space-y-2">
            <div>
              <label className="text-sm">Amount</label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 block w-full rounded border px-3 py-2"
                type="number"
                min="1"
                step="0.01"
              />
            </div>
            <div>
              <label className="text-sm">Apply to order (optional)</label>
              <select value={orderId} onChange={(e) => setOrderId(e.target.value)} className="mt-1 block w-full rounded border px-3 py-2">
                <option value="">(none)</option>
                {orders?.map((o) => (
                  <option key={o.id} value={o.id}>
                    {new Date(o.created_at).toLocaleString()} - {formatMoney(totalFromItems(o.order_items || []))}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button type="submit">Record</Button>
              <Button type="button" variant="ghost" onClick={() => { setAmount(""); setOrderId(""); }}>Clear</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
