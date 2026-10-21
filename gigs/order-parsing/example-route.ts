import { NextRequest, NextResponse } from 'next/server';
import { parseOrder } from './lib/ai/parse';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const chat = body.chat;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!chat) return NextResponse.json({ error: 'chat is required' }, { status: 400 });
    if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });

    const res = await parseOrder(chat, { apiKey });
    return NextResponse.json(res);
  } catch (e:any) {
    return NextResponse.json({ error: e.message ?? String(e) }, { status: 500 });
  }
}
