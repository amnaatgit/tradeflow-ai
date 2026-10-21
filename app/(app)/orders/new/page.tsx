"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { balanceDue, totalFromItems } from "@/lib/calc";
import type { Extraction } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ItemRow = { name: string; qty: string; unit_price: string };
type Draft = {
  customer_name: string;
  phone: string;
  address: string;
  area: string;
  advance: string;
  items: ItemRow[];
};
type ConfKey = keyof Extraction["confidence"];

const LOW = 0.7;
const MAX_CHARS = 4000;

const emptyItem = (): ItemRow => ({ name: "", qty: "1", unit_price: "" });
const emptyDraft = (): Draft => ({
  customer_name: "",
  phone: "",
  address: "",
  area: "",
  advance: "",
  items: [emptyItem()],
});

const str = (v: string | number | null | undefined) => (v === null || v === undefined ? "" : String(v));

function toDraft(x: Extraction): Draft {
  return {
    customer_name: str(x.customer_name),
    phone: str(x.phone),
    address: str(x.address),
    area: str(x.area),
    advance: str(x.advance),
    items: x.items.length
      ? x.items.map((i) => ({ name: i.name, qty: str(i.qty), unit_price: str(i.unit_price) }))
      : [emptyItem()],
  };
}

function isWhole(v: string) {
  return /^\d+$/.test(v.trim()) && Number(v) > 0;
}
function isMoney(v: string) {
  return v.trim() !== "" && Number.isFinite(Number(v)) && Number(v) >= 0;
}

function friendlyError(status: number, message: unknown): string {
  const m = typeof message === "string" ? message.replace(/^Error:\s*/, "") : "";
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 429) return "Too many requests. Wait a minute and try again.";
  if (m === "Empty chat") return "Paste the customer's message first.";
  if (m === "Input too long") return `That message is too long (max ${MAX_CHARS} characters).`;
  if (m === "Parsing failed") return "The AI couldn't read this chat. Fill in the order below instead.";
  return m || "Something went wrong while reading the chat. Fill in the order below instead.";
}

function money(n: number) {
  return `Rs ${n.toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;
}

export default function NewOrderPage() {
  const [chat, setChat] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [ai, setAi] = useState<Extraction | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  async function handleParse() {
    setParseError(null);
    setSaveError(null);
    setSavedId(null);
    if (!chat.trim()) {
      setParseError("Paste the customer's message first.");
      return;
    }
    setParsing(true);
    try {
      const res = await apiFetch("/api/parse", { chat });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAi(null);
        setDraft(emptyDraft());
        setParseError(friendlyError(res.status, json?.error));
        return;
      }
      const x = json as Extraction;
      const nothingFound =
        x.items.length === 0 && !x.customer_name && !x.phone && !x.address && !x.area && x.advance === null;
      if (nothingFound) {
        setAi(null);
        setDraft(emptyDraft());
        setParseError("This doesn't look like an order. Paste the customer's order message, or fill in the form below.");
        return;
      }
      setAi(x);
      setDraft(toDraft(x));
    } catch {
      setAi(null);
      setDraft(emptyDraft());
      setParseError("Couldn't reach the server. Check your connection, or fill in the order below.");
    } finally {
      setParsing(false);
    }
  }

  function startManual() {
    setAi(null);
    setParseError(null);
    setSaveError(null);
    setSavedId(null);
    setDraft(emptyDraft());
  }

  function reset() {
    setChat("");
    setAi(null);
    setDraft(null);
    setParseError(null);
    setSaveError(null);
    setSavedId(null);
  }

  const set = (key: Exclude<keyof Draft, "items">, value: string) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  const setItem = (idx: number, key: keyof ItemRow, value: string) =>
    setDraft((d) => (d ? { ...d, items: d.items.map((it, i) => (i === idx ? { ...it, [key]: value } : it)) } : d));
  const addItem = () => setDraft((d) => (d ? { ...d, items: [...d.items, emptyItem()] } : d));
  const removeItem = (idx: number) =>
    setDraft((d) => (d ? { ...d, items: d.items.filter((_, i) => i !== idx) } : d));

  // Yellow = empty, or the AI was not sure (confidence below 0.7).
  const unsure = (value: string, key?: ConfKey) =>
    value.trim() === "" || (ai !== null && key !== undefined && ai.confidence[key] < LOW);

  const items = draft?.items ?? [];
  const validItems = items.filter((i) => i.name.trim() && isWhole(i.qty) && isMoney(i.unit_price));
  const total = totalFromItems(validItems.map((i) => ({ qty: Number(i.qty), unit_price: Number(i.unit_price) })));
  const advanceNum = draft && isMoney(draft.advance) ? Number(draft.advance) : 0;
  const due = balanceDue(total, advanceNum);

  const problems: string[] = [];
  if (draft) {
    if (!draft.customer_name.trim()) problems.push("customer name");
    if (items.length === 0) problems.push("at least one item");
    items.forEach((it, i) => {
      if (!it.name.trim()) problems.push(`item ${i + 1} name`);
      if (!isWhole(it.qty)) problems.push(`item ${i + 1} quantity (whole number)`);
      if (!isMoney(it.unit_price)) problems.push(`item ${i + 1} unit price`);
    });
    if (draft.advance.trim() !== "" && !isMoney(draft.advance)) problems.push("advance (a number)");
  }
  const canSave = !!draft && problems.length === 0 && !saving;

  async function handleSave() {
    if (!draft || !canSave) return;
    setSaving(true);
    setSaveError(null);
    try {
      const supabase = createClient();
      const name = draft.customer_name.trim();
      const phone = draft.phone.trim() || null;
      const area = draft.area.trim() || null;

      // Reuse the customer with the same phone, otherwise create one. RLS keeps this per user.
      let customerId: string | null = null;
      if (phone) {
        const { data, error } = await supabase.from("customers").select("id").eq("phone", phone).maybeSingle();
        if (error) throw error;
        customerId = data?.id ?? null;
      }
      if (!customerId) {
        const { data, error } = await supabase.from("customers").insert({ name, phone, area }).select("id").single();
        if (error) throw error;
        customerId = data.id;
      }

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_id: customerId,
          raw_text: chat.trim() || null,
          address: draft.address.trim() || null,
          area,
          advance: advanceNum,
          status: "pending",
          ai_extraction: ai,
        })
        .select("id")
        .single();
      if (orderError) throw orderError;

      const { error: itemsError } = await supabase.from("order_items").insert(
        items.map((i) => ({
          order_id: order.id,
          name: i.name.trim(),
          qty: Number(i.qty),
          unit_price: Number(i.unit_price),
        }))
      );
      if (itemsError) {
        // Don't leave an order without items behind.
        await supabase.from("orders").delete().eq("id", order.id);
        throw itemsError;
      }

      setSavedId(order.id);
      setDraft(null);
      setAi(null);
      setChat("");
    } catch (err) {
      const message = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : "";
      setSaveError(`Couldn't save the order${message ? `: ${message}` : ""}. Please try again.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">New order</h1>
        <p className="text-sm text-muted-foreground">
          Paste the customer&apos;s WhatsApp or Instagram message. English, Roman Urdu or mixed is fine.
        </p>
      </div>

      {savedId && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-green-800">Order saved.</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={reset}>
                New order
              </Button>
              <Link href="/orders">
                <Button size="sm">View orders</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-3 p-4">
          <Label htmlFor="chat">Order chat</Label>
          <textarea
            id="chat"
            value={chat}
            onChange={(e) => setChat(e.target.value)}
            maxLength={MAX_CHARS}
            rows={6}
            placeholder="bhai 2 red kurta M size aur 1 black L, Gulshan block 5 flat 12, advance 1000 diya"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleParse} disabled={parsing || saving}>
              {parsing ? (
                <span className="inline-flex items-center">
                  <LoadingSpinner size={16} />Reading chat…
                </span>
              ) : (
                "Read with AI"
              )}
            </Button>
            <Button variant="ghost" onClick={startManual} disabled={parsing || saving}>
              Enter manually
            </Button>
            <span className="ml-auto text-xs text-muted-foreground">
              {chat.length}/{MAX_CHARS}
            </span>
          </div>
          {parseError && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {parseError}
            </p>
          )}
        </CardContent>
      </Card>

      {draft && (
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-lg">Check the order</CardTitle>
            <CardDescription>
              {ai ? "Filled in by AI. Yellow fields are missing or uncertain; check them before saving." : "Fill in the order details."}
              {" "}Nothing is saved until you press Confirm &amp; save.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Customer name *" id="customer_name" value={draft.customer_name} warn={unsure(draft.customer_name, "customer_name")} onChange={(v) => set("customer_name", v)} />
              <Field label="Phone" id="phone" value={draft.phone} warn={unsure(draft.phone, "phone")} onChange={(v) => set("phone", v)} inputMode="tel" />
              <Field label="Address" id="address" value={draft.address} warn={unsure(draft.address, "address")} onChange={(v) => set("address", v)} className="sm:col-span-2" />
              <Field label="Area" id="area" value={draft.area} warn={unsure(draft.area)} onChange={(v) => set("area", v)} />
              <Field label="Advance paid (Rs)" id="advance" value={draft.advance} warn={unsure(draft.advance, "advance")} onChange={(v) => set("advance", v)} inputMode="decimal" />
            </div>

            <div className="space-y-2">
              <Label>Items *</Label>
              {items.length === 0 && <p className="text-sm text-muted-foreground">No items yet. Add one below.</p>}
              {items.map((it, idx) => {
                const itemsUnsure = ai !== null && ai.confidence.items < LOW;
                return (
                  <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 rounded-md border p-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
                    <Input
                      aria-label={`Item ${idx + 1} name`}
                      placeholder="Item"
                      value={it.name}
                      onChange={(e) => setItem(idx, "name", e.target.value)}
                      className={cn("col-span-3 sm:col-span-1", (itemsUnsure || !it.name.trim()) && "border-yellow-400 bg-yellow-50")}
                    />
                    <Input
                      aria-label={`Item ${idx + 1} quantity`}
                      placeholder="Qty"
                      inputMode="numeric"
                      value={it.qty}
                      onChange={(e) => setItem(idx, "qty", e.target.value)}
                      className={cn((itemsUnsure || !isWhole(it.qty)) && "border-yellow-400 bg-yellow-50")}
                    />
                    <Input
                      aria-label={`Item ${idx + 1} unit price`}
                      placeholder="Price (Rs)"
                      inputMode="decimal"
                      value={it.unit_price}
                      onChange={(e) => setItem(idx, "unit_price", e.target.value)}
                      className={cn((itemsUnsure || !isMoney(it.unit_price)) && "border-yellow-400 bg-yellow-50")}
                    />
                    <Button variant="ghost" size="sm" className="h-10" onClick={() => removeItem(idx)} aria-label={`Remove item ${idx + 1}`}>
                      Remove
                    </Button>
                  </div>
                );
              })}
              <Button variant="outline" size="sm" onClick={addItem}>
                Add item
              </Button>
            </div>

            <div className="space-y-1 rounded-md bg-muted p-3 text-sm">
              <div className="flex justify-between"><span>Total</span><span className="font-medium">{money(total)}</span></div>
              <div className="flex justify-between"><span>Advance</span><span>− {money(advanceNum)}</span></div>
              <div className="flex justify-between border-t pt-1 font-semibold"><span>Due on delivery</span><span>{money(due)}</span></div>
            </div>

            {problems.length > 0 && (
              <p className="text-sm text-muted-foreground">To save, fill in: {problems.join(", ")}.</p>
            )}
            {saveError && (
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {saveError}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSave} disabled={!canSave}>
                {saving ? (
                  <span className="inline-flex items-center">
                    <LoadingSpinner size={16} />Saving…
                  </span>
                ) : (
                  "Confirm & save"
                )}
              </Button>
              <Button variant="ghost" onClick={reset} disabled={saving}>
                Discard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({
  label,
  id,
  value,
  warn,
  onChange,
  className,
  inputMode,
}: {
  label: string;
  id: string;
  value: string;
  warn: boolean;
  onChange: (v: string) => void;
  className?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className={cn(warn && "border-yellow-400 bg-yellow-50")}
      />
    </div>
  );
}
