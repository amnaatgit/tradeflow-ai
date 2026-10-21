"use client";

import { useState } from "react";
import { whatsAppLink } from "../lib/whatsapp";

type Kind = "confirmation" | "reminder" | "out_for_delivery" | "thank_you";
type Language = "roman_urdu" | "english" | "urdu";

type Props = {
  kind: Kind;
  phone?: string | null;
  // Order facts sent to /api/draft (numbers and names only).
  facts: {
    shop_name?: string | null;
    customer_name?: string | null;
    items?: { name: string; qty: number; unit_price: number | null }[];
    total?: number | null;
    advance?: number | null;
    paid?: number | null;
    due?: number | null;
    address?: string | null;
  };
  title?: string;
  endpoint?: string; // defaults to /api/draft
  // Add your auth header/token here if your route needs it.
  fetcher?: (url: string, body: unknown) => Promise<Response>;
};

const defaultFetcher = (url: string, body: unknown) =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

// Language + tone pickers, "Write with AI", an editable draft, Copy and Open WhatsApp.
// Nothing is sent automatically: the seller always reviews the text.
export function AiMessageBox({ kind, phone, facts, title = "WhatsApp message (AI)", endpoint = "/api/draft", fetcher = defaultFetcher }: Props) {
  const [language, setLanguage] = useState<Language>("roman_urdu");
  const [tone, setTone] = useState<"friendly" | "firm">("friendly");
  const [text, setText] = useState("");
  const [source, setSource] = useState<"ai" | "template" | null>(null);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function write() {
    setLoading(true);
    setNote(null);
    try {
      const res = await fetcher(endpoint, { kind, language, tone, ...facts });
      const json = await res.json();
      if (!res.ok || typeof json?.message !== "string") throw new Error(json?.error || "failed");
      setText(json.message);
      setSource(json.source === "template" ? "template" : "ai");
      if (json.source === "template") setNote("AI is busy, so this is the standard message. You can still edit it.");
    } catch {
      setNote("Couldn't write the message. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setNote("Copied.");
    } catch {
      setNote("Copy failed. Select the text and copy it manually.");
    }
  }

  const link = text ? whatsAppLink(phone, text) : null;

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 text-sm font-medium">{title}</div>
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Language" value={language} onChange={(e) => setLanguage(e.target.value as Language)} className="rounded border px-2 py-1 text-sm">
          <option value="roman_urdu">Roman Urdu</option>
          <option value="english">English</option>
          <option value="urdu">اردو</option>
        </select>
        {kind === "reminder" && (
          <select aria-label="Tone" value={tone} onChange={(e) => setTone(e.target.value as "friendly" | "firm")} className="rounded border px-2 py-1 text-sm">
            <option value="friendly">Friendly</option>
            <option value="firm">Firm</option>
          </select>
        )}
        <button type="button" onClick={write} disabled={loading} className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
          {loading ? "Writing…" : text ? "Write again" : "Write with AI"}
        </button>
      </div>
      {text && (
        <div className="mt-3 space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            dir={language === "urdu" ? "rtl" : "ltr"}
            aria-label="Message draft"
            className="w-full rounded border p-2 text-sm"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={copy} className="rounded-md border px-3 py-1.5 text-sm">
              Copy
            </button>
            {link && (
              <a href={link} target="_blank" rel="noreferrer" className="rounded-md bg-green-600 px-3 py-1.5 text-sm text-white">
                Open WhatsApp
              </a>
            )}
            {source === "ai" && <span className="text-xs text-gray-500">Written by AI. Check before sending.</span>}
          </div>
        </div>
      )}
      {note && <p className="mt-2 text-xs text-gray-500">{note}</p>}
    </div>
  );
}
