import { NextResponse } from "next/server";
import { getAccessToken, requireUser } from "@/lib/supabase/server";
import { parseOrder } from "@/lib/ai/parse";

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // per user
const buckets: Map<string, { ts: number; count: number }> = new Map();

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = getAccessToken(req, body);
  const userRes = await requireUser(token);
  if (!userRes) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // enforce server-side 2FA: if account has a verified factor but AAL is not aal2
  if (userRes.user.factors?.some((f: any) => f.status === "verified") && userRes.aal !== "aal2") {
    return NextResponse.json({ error: "Enter your 2FA code first" }, { status: 403 });
  }
  const userId = userRes.user.id;

  const now = Date.now();
  const bucket = buckets.get(userId) ?? { ts: now, count: 0 };
  if (now - bucket.ts > RATE_LIMIT_WINDOW) {
    bucket.ts = now;
    bucket.count = 0;
  }
  bucket.count++;
  buckets.set(userId, bucket);
  if (bucket.count > RATE_LIMIT_MAX) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const chat = typeof body?.chat === "string" ? body.chat.trim() : "";
  if (!chat) return NextResponse.json({ error: "Empty chat" }, { status: 400 });
  if (chat.length > 4000) return NextResponse.json({ error: "Input too long" }, { status: 400 });

  try {
    const res = await parseOrder(chat);
    if (!res.success) {
      return NextResponse.json({ error: "Parsing failed", details: res.error, raw: res.raw }, { status: 500 });
    }
    return NextResponse.json(res.data);
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
