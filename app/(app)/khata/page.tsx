"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { totalFromItems, customerBalance } from "@/lib/calc";

function formatMoney(n: number) {
  return "Rs " + n.toLocaleString("en-IN");
}

export default function KhataPage() {
  const [customers, setCustomers] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const supabase = createClient();
    const customersQ = supabase.from("customers").select("id,name,phone,area,orders(id,customer_id,status,advance,order_items(qty,unit_price))");
    const paymentsQ = supabase.from("payments").select("*");
    Promise.all([customersQ, paymentsQ])
      .then(([res, pRes]) => {
        if (!mounted) return;
        if (res.error) {
          setError(res.error.message);
          setCustomers([]);
          return;
        }
        if (pRes.error) {
          setError(pRes.error.message);
          setCustomers([]);
          return;
        }
        const payments = pRes.data || [];
        const data = (res.data as any[]).map((c) => {
          const custPayments = payments.filter((p) => p.customer_id === c.id);
          const orders = c.orders || [];
          const balance = customerBalance(orders, custPayments);
          return { ...c, balance };
        });
        setCustomers(data);
      })
      .catch((err) => setError((err as any)?.message ?? String(err)))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = (customers || [])
    .filter((c) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (c.name || "").toLowerCase().includes(q) || (c.phone || "").includes(q);
    })
    .sort((a, b) => (b.balance || 0) - (a.balance || 0));

  if (loading) return <p className="p-4">Loading…</p>;
  if (error)
    return (
      <Card className="m-4">
        <CardHeader>
          <CardTitle>Khata</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error: {error}</p>
        </CardContent>
      </Card>
    );

  return (
    <div className="p-4 space-y-3">
      <Card>
        <CardHeader>
          <CardTitle>Khata</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-2">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or phone" className="w-full rounded border px-3 py-2" />
          </div>
          <div className="divide-y">
            {filtered.length === 0 && <div className="p-2 text-sm">No customers found</div>}
            {filtered.map((c) => (
              <Link key={c.id} href={`/khata/${c.id}`} className="block p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-muted-foreground">{c.phone}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatMoney(c.balance || 0)}</div>
                    <div className="text-xs text-muted-foreground">{c.area}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
