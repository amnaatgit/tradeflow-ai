"use client";

import { useRef, useState } from "react";
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
import { normalizePhone } from "@/lib/phone";

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

const SAMPLES: { roman: string[]; english: string[]; mixed: string[] } = {
  roman: [
    "Assalam o alaikum, Bilal bol raha hun. 3 kurtay chahiye medium size, 1800 ka ek. Address flat 7, Gulshan block 13, Karachi. Number 0333-1112233. 1000 advance bhej diya",
    "AoA baji, mujhe 2 lawn suit chahiye, ek maroon aur ek mint green, 3500 ka ek. Address house 45, street 9, G-11/2 Islamabad. Number 0301-5566778. 2000 advance JazzCash kar diya hai. Naam Fatima",
    "Bhai 5 kg basmati chawal chahiye 380 rupay kilo, aur 2 desi ghee ke dabbay 1450 ka ek. Satellite Town block C, ghar 112, Rawalpindi. 0322-4477889. Cash on delivery. Imran",
    "Salam, 1 darjan cupcakes chahiye birthday ke liye, 150 ka ek, aur 1 chocolate cake 2 pound wala 2200 ka. Model Town Lahore, house 7-A. 0333-9081726. 1000 advance easypaisa kar diya. Ayesha",
  ],
  english: [
    "Hi! I'd like 1 bridal clutch (gold) for Rs 4500 and 2 pairs of jhumkay at 1200 each. Deliver to 45-B Johar Town, Lahore. Call 0312-9988776. I've sent 2000 via JazzCash. - Hira",
    "Hello, I want to order 3 scented candles (vanilla) at Rs 850 each and 1 gift box for Rs 500. Please deliver to Flat 12, Clifton Block 5, Karachi. My number is 0300-2233445. I'll pay cash on delivery. Thanks, Sana",
    "Hi, can I get 2 white kurta shalwar (size L) at 3200 each and 1 waistcoat for 4500? Address: House 21, Street 4, F-7/3 Islamabad. Phone 0345-6677889. I sent 3000 advance by bank transfer. - Ahmed",
    "Good evening! Please send 4 jars of honey (500g) at Rs 1100 each. Delivery to 88-C Gulberg III, Lahore. Contact 0321-1239870. Paid 1000 advance on Easypaisa. Name: Zainab",
  ],
  mixed: [
    "Salam, Usman here. do darjan cupcakes chahiye, 150 ka ek, aur 1 chocolate cake 2 pound wala 2200. Gulshan block 13 flat 22, Karachi. 0345-1239876. Delivery 200 add kar dein. Advance abhi nahi diya",
    "Hi baji, Maria here. 2 abaya chahiye black, size 54, 4200 each, aur 1 hijab set 900. Address DHA phase 6, street 11, house 3, Karachi. Number 0312-7788990. 2000 advance sent on JazzCash, delivery 250 theek hai",
    "Assalam o alaikum! I need 3 packs of organic shahad, 1200 ka ek, and 1 kg dry fruit mix for 2800. Bahria Town phase 4, house 19, Rawalpindi. 0302-3344556. COD please. - Kamran",
    "Salam, 2 pairs khussa (golden, size 7) 2500 each and 1 clutch 1800 please. Deliver to Hayatabad phase 3, house 55, Peshawar. Number 0315-9988112. Advance nahi diya, cash on delivery. Rabia",
  ],
};

type SampleKind = keyof typeof SAMPLES;

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
  if (m === "Enter your 2FA code first") return "Please sign in again and enter your 2FA code.";
  if (m === "Input too long") return `That message is too long (max ${MAX_CHARS} characters).`;
  if (m === "Parsing failed") return "The AI couldn't read this chat. Fill in the order below instead.";
  if (m === "Unsupported file type") return "That file type isn't supported. Upload a JPG/PNG/WebP image or an MP3/MP4/OGG/AAC/WAV audio file.";
  if (m === "File too large") return "That file is too large. Try a smaller screenshot or voice note.";
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

  // Attachment state
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [attachmentMime, setAttachmentMime] = useState<string | null>(null);
  const [attachmentBase64, setAttachmentBase64] = useState<string | null>(null); // no data: prefix
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null); // data URL for image preview
  const [attachmentKind, setAttachmentKind] = useState<"image" | "audio" | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  function clearAttachment() {
    setAttachmentBase64(null);
    setAttachmentMime(null);
    setAttachmentName(null);
    setAttachmentPreview(null);
    setAttachmentKind(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (audioInputRef.current) audioInputRef.current.value = "";
  }

  function pickRandomSample(kind: SampleKind, current: string): string {
    const options = SAMPLES[kind];
    if (!options || options.length === 0) return current;
    const different = options.filter((s) => s !== current);
    const pool = different.length > 0 ? different : options;
    const index = Math.floor(Math.random() * pool.length);
    return pool[index];
  }

  function handleSampleClick(kind: SampleKind) {
    const sample = pickRandomSample(kind, chat);
    setChat(sample);
    setParseError(null);
  }

  async function handleParse() {
    setParseError(null);
    setSaveError(null);
    setSavedId(null);
    if (!chat.trim() && !attachmentBase64) {
      setParseError("Paste the customer's message first or upload a screenshot/voice note.");
      return;
    }
    setParsing(true);
    try {
      const body: any = { chat };
      if (attachmentBase64 && attachmentMime) {
        body.media = { mimeType: attachmentMime, data: attachmentBase64 };
      }
      const res = await apiFetch("/api/parse", body);
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
    clearAttachment();
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
      const rawPhone = draft.phone.trim() || null;
      const area = draft.area.trim() || null;
      // normalize phone so lookups match
      let phone: string | null = null;
      if (rawPhone) {
        try {
          phone = normalizePhone(rawPhone);
        } catch (e) {
          phone = rawPhone;
        }
      }

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

      const rawText = chat.trim() || (ai?.transcript ? (attachmentKind === "image" ? `[From screenshot] ${ai.transcript}` : `[From voice note] ${ai.transcript}`) : null);

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_id: customerId,
          raw_text: rawText,
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
      clearAttachment();
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
          Paste the customer&apos;s message, or upload a chat screenshot or voice note. English, Roman Urdu or mixed is fine.
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
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor="chat">Order chat</Label>
            <span className="text-xs text-muted-foreground">Try a sample:</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSampleClick("roman")}
            >
              Roman Urdu
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSampleClick("english")}
            >
              English
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSampleClick("mixed")}
            >
              Mixed
            </Button>
          </div>
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
            <input
              id="upload-image"
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                // Validate size (let's allow big but we'll trim by base64 length later)
                try {
                  // Draw to canvas with longest side max 1600
                  const img = await new Promise<HTMLImageElement>((res, rej) => {
                    const url = URL.createObjectURL(f);
                    const i = new Image();
                    i.onload = () => {
                      URL.revokeObjectURL(url);
                      res(i);
                    };
                    i.onerror = rej;
                    i.src = url;
                  });
                  const max = 1600;
                  const ratio = Math.min(1, max / Math.max(img.width, img.height));
                  const cw = Math.round(img.width * ratio);
                  const ch = Math.round(img.height * ratio);
                  const canvas = document.createElement("canvas");
                  canvas.width = cw;
                  canvas.height = ch;
                  const ctx = canvas.getContext("2d");
                  if (!ctx) throw new Error("Canvas not supported");
                  ctx.drawImage(img, 0, 0, cw, ch);
                  const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
                  const base = dataUrl.split(",")[1] ?? "";
                  setAttachmentBase64(base);
                  setAttachmentMime("image/jpeg");
                  setAttachmentPreview(dataUrl);
                  setAttachmentName(f.name);
                  setAttachmentKind("image");
                } catch (err) {
                  setParseError("Couldn't process the image");
                }
              }}
            />
            <Button type="button" variant="outline" onClick={() => imageInputRef.current?.click()} disabled={parsing || saving}>
              Upload screenshot
            </Button>

            <input
              id="upload-audio"
              ref={audioInputRef}
              type="file"
              accept="audio/*,.opus,.ogg,.m4a,.mp3,.wav,.aac"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 3 * 1024 * 1024) {
                  setParseError("Voice note is too big (max 3 MB)");
                  return;
                }
                try {
                  const reader = new FileReader();
                  reader.onload = () => {
                    const result = reader.result as string;
                    const base = result.split(",")[1] ?? "";
                    let mime = f.type;
                    if (!mime) {
                      const ext = f.name.split(".").pop()?.toLowerCase();
                      mime = ext === "opus" || ext === "ogg" ? "audio/ogg" : ext === "m4a" ? "audio/mp4" : ext === "mp3" ? "audio/mpeg" : ext === "wav" ? "audio/wav" : ext === "aac" ? "audio/aac" : ext === "webm" ? "audio/webm" : "";
                    }
                    setAttachmentBase64(base);
                    setAttachmentMime(mime || null);
                    setAttachmentPreview(null);
                    setAttachmentName(f.name);
                    setAttachmentKind("audio");
                  };
                  reader.readAsDataURL(f);
                } catch (err) {
                  setParseError("Couldn't read the audio file");
                }
              }}
            />
            <Button type="button" variant="outline" onClick={() => audioInputRef.current?.click()} disabled={parsing || saving}>
              Upload voice note
            </Button>

            <Button onClick={handleParse} disabled={parsing || saving}>
              {parsing ? (
                <span className="inline-flex items-center">
                  <LoadingSpinner size={16} />{attachmentKind === "image" ? "Reading screenshot…" : attachmentKind === "audio" ? "Listening to voice note…" : "Reading chat…"}
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
          {attachmentBase64 && (
            <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/40 p-2 text-sm">
              <div className="flex min-w-0 items-center gap-3">
                {attachmentKind === "image" && attachmentPreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={attachmentPreview} alt="Chat screenshot" className="h-16 w-auto rounded object-contain" />
                )}
                <span className="truncate">
                  {attachmentKind === "image" ? "Screenshot" : "Voice note"}: {attachmentName}
                </span>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={clearAttachment} disabled={parsing}>
                Remove
              </Button>
            </div>
          )}
          {parseError && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {parseError}
            </p>
          )}
        </CardContent>
      </Card>

      {ai?.transcript && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-1 text-sm font-medium">
              {attachmentKind === "audio" ? "What the AI heard" : "What the AI read"}
            </div>
            <p className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm text-muted-foreground">{ai.transcript}</p>
          </CardContent>
        </Card>
      )}

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

            {ai?.transcript && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <div className="text-xs text-muted-foreground">{attachmentKind === "image" ? "What the AI read" : "What the AI heard"}</div>
                <div className="mt-2 whitespace-pre-wrap">{ai.transcript}</div>
              </div>
            )}

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
