"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { totalFromItems, balanceDue } from '@/lib/calc';
import { formatDate, formatDateTime } from '@/lib/format';
import { copyText } from '@/lib/clipboard';
import { toWhatsAppNumber } from '@/lib/whatsapp';
import { AiMessageBox } from '@/components/ai-message-box';

export default function ReceiptPage() {
  const params = useParams();
  const id = params?.id as string;
  const [order, setOrder] = useState<any | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copyFallback, setCopyFallback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const supabase = createClient();
    Promise.all([
      supabase
        .from('orders')
        .select('id,created_at,status,raw_text,address,area,advance,customers(name,phone),order_items(name,qty,unit_price)')
        .eq('id', id)
        .single(),
      supabase.from('payments').select('id,amount,created_at,order_id,method').eq('order_id', id),
    ])
      .then(([r1, r2]) => {
        if (!mounted) return;
        if (r1.error) setError(r1.error.message);
        else setOrder(r1.data);
        if (r2.error) setError((e) => e ? e + '; ' + r2.error.message : r2.error.message);
        else setPayments(r2.data || []);
      })
      .catch((e) => setError((e as any)?.message ?? String(e)))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [id]);

  function formatMoney(n: number) {
    return 'Rs ' + n.toLocaleString('en-IN');
  }

  function buildText() {
    if (!order) return '';
    const items = order.order_items || [];
    const total = totalFromItems(items);
    const advance = order.advance || 0;
    const paymentsSum = payments.reduce((s, p) => s + p.amount, 0);
    const due = balanceDue(total, advance, paymentsSum);
    const lines = [];
    lines.push('TradeFlow AI');
    lines.push(`Date: ${formatDateTime(order.created_at)}`);
    lines.push(`Order: ${order.id.slice(0, 8)}`);
    lines.push(`Customer: ${order.customers?.name || 'Unknown'}`);
    lines.push(`Phone: ${order.customers?.phone || '-'}`);
    lines.push('');
    lines.push('Items:');
    items.forEach((it: any) => {
      lines.push(`${it.name} x${it.qty} @ ${formatMoney(it.unit_price)} = ${formatMoney(it.unit_price * it.qty)}`);
    });
    lines.push('');
    lines.push(`Total: ${formatMoney(total)}`);
    lines.push(`Advance: ${formatMoney(advance)}`);
    lines.push('Payments:');
    payments.forEach((p) =>
      lines.push(`${formatDate(p.created_at)}: ${formatMoney(p.amount)}${p.method ? ` (${p.method})` : ''}`)
    );
    lines.push(order.status === 'cancelled' ? 'Order CANCELLED. Nothing to collect.' : `Amount due: ${formatMoney(due)}`);
    return lines.join('\n');
  }

  async function handleCopy() {
    const text = buildText();
    const ok = await copyText(text);
    if (!ok) setCopyFallback(text);
  }

  if (loading)
    return (
      <div className="space-y-4 p-4">
        <div className="flex flex-wrap gap-2 print:hidden">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-36" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  if (error) return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle>Receipt</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-destructive">Error: {error}</p>
      </CardContent>
    </Card>
  );
  if (!order) return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle>Receipt</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Order not found.</p>
      </CardContent>
    </Card>
  );

  const items = order.order_items || [];
  const total = totalFromItems(items);
  const advance = order.advance || 0;
  const paymentsSum = payments.reduce((s, p) => s + p.amount, 0);
  const due = balanceDue(total, advance, paymentsSum);

  const whatsappText = encodeURIComponent(buildText());
  const waPhone = toWhatsAppNumber(order.customers?.phone || '');

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        <Button onClick={() => window.print()}>Print</Button>
        <Button onClick={handleCopy}>Copy WhatsApp text</Button>
        {waPhone && (
          <a href={`https://wa.me/${waPhone}?text=${whatsappText}`} target="_blank" rel="noreferrer">
            <Button variant="outline">Open WhatsApp</Button>
          </a>
        )}
      </div>

      {order.status !== 'cancelled' && (
        <div className="mb-4">
          <AiMessageBox
            kind="confirmation"
            title="WhatsApp confirmation (AI)"
            phone={order.customers?.phone}
            payload={{
              customer_name: order.customers?.name ?? null,
              items: items.map((it: any) => ({ name: it.name, qty: it.qty, unit_price: it.unit_price })),
              total,
              advance,
              paid: paymentsSum,
              due,
              address: order.address ?? null,
            }}
            fallbackText={buildText()}
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Receipt</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose">
            <h2>TradeFlow AI</h2>
            <div>{formatDateTime(order.created_at)}</div>
            <div>Order: {order.id.slice(0,8)}</div>
            {order.status === 'cancelled' && <div className="text-destructive font-bold">CANCELLED</div>}
            <div>Customer: {order.customers?.name || 'Unknown'}</div>
            <div>Phone: {order.customers?.phone || '-'}</div>
            <div>Address: {order.address || '-'}</div>
            <table className="w-full text-sm mt-2">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th className="text-right">Line</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it: any, i: number) => (
                  <tr key={i} className="border-t">
                    <td className="py-2">{it.name}</td>
                    <td className="py-2">{it.qty}</td>
                    <td className="py-2">{formatMoney(it.unit_price)}</td>
                    <td className="py-2 text-right">{formatMoney(it.unit_price * it.qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pt-2 text-right">
              <div className="text-sm">Total: {formatMoney(total)}</div>
              <div className="text-sm">Advance: {formatMoney(advance)}</div>
              <div className="text-sm">Payments:</div>
              <ul>
                {payments.map((p) => (
                  <li key={p.id}>
                    {formatDate(p.created_at)}: {formatMoney(p.amount)}
                    {p.method ? ` · ${p.method}` : ''}
                  </li>
                ))}
              </ul>
              <div className="text-lg font-medium">{order.status === 'cancelled' ? 'Cancelled, nothing to collect' : `Amount due: ${formatMoney(due)}`}</div>
            </div>

            {copyFallback && (
              <div className="mt-4">
                <p className="text-sm">Copy failed. You can copy manually:</p>
                <textarea readOnly value={copyFallback} className="w-full h-40 mt-2" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
