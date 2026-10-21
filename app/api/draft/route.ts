import { NextResponse } from "next/server";
import { getAccessToken, requireUser } from "@/lib/supabase/server";
import { DraftInput, draftMessage } from "@/lib/ai/draft";

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 20; // per user
const buckets: Map<string, { ts: number; count: number }> = new Map();

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = getAccessToken(req, body);
  const userRes = await requireUser(token);
  if (!userRes) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Accounts that turned 2FA on must have entered their code (same rule as /api/parse).
  if (userRes.user.factors?.some((f) => f.status === "verified") && userRes.aal !== "aal2") {
    return NextResponse.json({ error: "Enter your 2FA code first" }, { status: 403 });
  }

  const now = Date.now();
  const bucket = buckets.get(userRes.user.id) ?? { ts: now, count: 0 };
  if (now - bucket.ts > RATE_LIMIT_WINDOW) {
    bucket.ts = now;
    bucket.count = 0;
  }
  bucket.count++;
  buckets.set(userRes.user.id, bucket);
  if (bucket.count > RATE_LIMIT_MAX) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const parsed = DraftInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    return NextResponse.json(await draftMessage(parsed.data));
  } catch (err) {
    console.error("[draft]", String(err).slice(0, 300));
    return NextResponse.json({ error: "The AI is busy right now. Try again in a minute" }, { status: 502 });
  }
}
