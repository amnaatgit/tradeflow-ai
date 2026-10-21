import { NextResponse } from "next/server";
import { parseOrder } from "../../../lib/ai/parse";
import { validateMedia, type Media } from "../../../lib/media";

// POST { chat?: string, media?: { mimeType, data } } -> validated order JSON (+ transcript for files).
export async function POST(req: Request) {
  // TODO (recommended): check the signed-in user here and rate limit per user.
  const body = await req.json().catch(() => ({}));
  const chat = typeof body?.chat === "string" ? body.chat.trim() : "";
  if (chat.length > 4000) return NextResponse.json({ error: "Input too long" }, { status: 400 });

  let media: Media | undefined;
  if (body?.media) {
    const v = validateMedia(body.media);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: v.status });
    media = v.media;
  }
  if (!chat && !media) return NextResponse.json({ error: "Empty chat" }, { status: 400 });

  try {
    const res = await parseOrder(chat, media);
    if (!res.success) return NextResponse.json({ error: "Parsing failed" }, { status: 502 });
    return NextResponse.json(res.data);
  } catch (err) {
    const busy = String(err).includes("busy");
    return NextResponse.json({ error: busy ? "The AI is busy right now. Try again in a minute" : "AI error" }, { status: busy ? 503 : 500 });
  }
}
