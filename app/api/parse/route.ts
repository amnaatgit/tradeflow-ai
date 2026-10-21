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

    // Accept chat text or media. If media.data starts with data: strip the prefix.
  const chat = typeof body?.chat === "string" ? body.chat.trim() : "";
  const media = body?.media && typeof body.media === "object" ? body.media : null;
  let mime: string | null = null;
  let data: string | null = null;
  if (media) {
    mime = typeof media.mimeType === "string" ? media.mimeType : null;
    data = typeof media.data === "string" ? media.data : null;
    if (data && data.startsWith("data:")) {
      const idx = data.indexOf(",");
      if (idx >= 0) data = data.slice(idx + 1);
    }
  }

  if (!chat && !data) return NextResponse.json({ error: "Empty chat" }, { status: 400 });
  if (chat && chat.length > 4000) return NextResponse.json({ error: "Input too long" }, { status: 400 });
  if (data && data.length > 4_000_000) return NextResponse.json({ error: "File too large" }, { status: 413 });

  const allowed = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "audio/ogg",
    "audio/mpeg",
    "audio/mp4",
    "audio/aac",
    "audio/wav",
    "audio/webm",
  ];
  if (data && (!mime || !allowed.includes(mime))) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  try {
    const res = await parseOrder(chat, data ? { mimeType: mime as string, data } : undefined);
    if (!res.success) {
      return NextResponse.json({ error: "Parsing failed", details: res.error, raw: res.raw }, { status: 500 });
    }
    return NextResponse.json(res.data);
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
