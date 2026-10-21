import { NextResponse } from "next/server";
import { DraftInput, draftMessage } from "../../../lib/ai/draft";
import { draftFallback } from "../../../lib/templates";

// Simple per-IP limit so nobody can drain your Gemini quota. Use your user id when you have auth.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const hits = new Map<string, { ts: number; count: number }>();

export async function POST(req: Request) {
  // TODO (recommended): check your session here and return 401 for signed-out users.
  const key = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const h = hits.get(key) ?? { ts: now, count: 0 };
  if (now - h.ts > WINDOW_MS) {
    h.ts = now;
    h.count = 0;
  }
  h.count++;
  hits.set(key, h);
  if (h.count > MAX_PER_WINDOW) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const parsed = DraftInput.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    const { message } = await draftMessage(parsed.data);
    return NextResponse.json({ message, source: "ai" });
  } catch (err) {
    console.error("[draft]", String(err).slice(0, 300));
    // Still useful: return the standard template so the UI always has something to send.
    return NextResponse.json({ message: draftFallback(parsed.data), source: "template" });
  }
}
