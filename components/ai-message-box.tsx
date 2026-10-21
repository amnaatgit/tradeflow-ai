"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { copyText } from "@/lib/clipboard";
import { toWhatsAppNumber } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";

type Props = {
  kind: "confirmation" | "reminder";
  title: string;
  phone: string | null | undefined;
  // Order facts sent to /api/draft (numbers only, no free text from the chat).
  payload: {
    customer_name?: string | null;
    items?: { name: string; qty: number; unit_price: number | null }[];
    total?: number | null;
    advance?: number | null;
    paid?: number | null;
    due?: number | null;
    address?: string | null;
  };
  // Standard message used when the AI is unavailable.
  fallbackText: string;
};

// AI-written WhatsApp message: the seller picks a language (and tone for reminders),
// edits the draft, then copies it or opens WhatsApp. Nothing is sent automatically.
export function AiMessageBox({ kind, title, phone, payload, fallbackText }: Props) {
  const [language, setLanguage] = useState<"roman_urdu" | "english">("roman_urdu");
  const [tone, setTone] = useState<"friendly" | "firm">("friendly");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const wa = phone ? toWhatsAppNumber(phone) : null;

  async function write() {
    setLoading(true);
    setNote(null);
    try {
      const res = await apiFetch("/api/draft", { kind, language, tone, ...payload });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || typeof json?.message !== "string") throw new Error(json?.error || "failed");
      setText(json.message);
    } catch {
      setText(fallbackText);
      setNote("AI unavailable, using the standard message.");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    const ok = await copyText(text).catch(() => false);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setNote("Copy failed. Select the text and copy it manually.");
    }
  }

  return (
    <div className="rounded-md border p-3 print:hidden">
      <div className="mb-2 text-sm font-medium">{title}</div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Language"
          value={language}
          onChange={(e) => setLanguage(e.target.value as "roman_urdu" | "english")}
          className="rounded border px-2 py-1 text-sm"
        >
          <option value="roman_urdu">Roman Urdu</option>
          <option value="english">English</option>
        </select>
        {kind === "reminder" && (
          <select
            aria-label="Tone"
            value={tone}
            onChange={(e) => setTone(e.target.value as "friendly" | "firm")}
            className="rounded border px-2 py-1 text-sm"
          >
            <option value="friendly">Friendly</option>
            <option value="firm">Firm</option>
          </select>
        )}
        <Button type="button" size="sm" onClick={write} disabled={loading}>
          {loading ? "Writing…" : text ? "Write again" : "Write with AI"}
        </Button>
      </div>
      {text && (
        <div className="mt-3 space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            className="w-full rounded border p-2 text-sm"
            aria-label="Message draft"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={copy}>
              {copied ? "Copied" : "Copy"}
            </Button>
            {wa && (
              <a href={`https://wa.me/${wa}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
                <Button type="button" size="sm">
                  Open WhatsApp
                </Button>
              </a>
            )}
          </div>
        </div>
      )}
      {note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
