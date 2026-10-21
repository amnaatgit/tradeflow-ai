import { MODEL, FALLBACK_MODELS } from "./config";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const TRANSIENT = [429, 500, 503];
// A busy model can take close to a minute before it answers 503, so each request
// gets a time limit and the next model is tried. Screenshots and voice notes need longer.
const TEXT_TIMEOUT_MS = 15000;
const MEDIA_TIMEOUT_MS = 30000;

// An image or audio file sent inline with the prompt (base64, no "data:" prefix).
export type Media = { mimeType: string; data: string };

type GeminiResponse = {
  error?: { message?: string };
  candidates?: { content?: { parts?: { text?: string }[] } }[];
};

function call(model: string, system: string, user: string, apiKey: string, media?: Media) {
  const parts: Record<string, unknown>[] = [];
  if (media) parts.push({ inlineData: { mimeType: media.mimeType, data: media.data } });
  parts.push({ text: user });
  return fetch(`${BASE}/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts }],
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 4096 },
    }),
    signal: AbortSignal.timeout(media ? MEDIA_TIMEOUT_MS : TEXT_TIMEOUT_MS),
  });
}

// One Gemini generateContent call, optionally with an image or audio file.
// If a model is busy (429/500/503) or retired (404), the next model in
// FALLBACK_MODELS is tried after a short pause. A model that times out or fails to
// connect is skipped the same way. Returns the model's text (JSON as a string).
export async function generate(system: string, user: string, media?: Media): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const models = [MODEL, ...FALLBACK_MODELS.filter((m) => m !== MODEL)];
  let res: Response | null = null;
  let json: GeminiResponse = {};
  let timedOut = false;

  for (let i = 0; i < models.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 300 * i));
    try {
      res = await call(models[i], system, user, apiKey, media);
      json = (await res.json().catch(() => ({}))) as GeminiResponse;
      timedOut = false;
    } catch {
      // Timeout, abort or network error: log on the server and try the next model.
      console.error(`[gemini] ${models[i]} timed out or network error`);
      res = null;
      timedOut = true;
      continue;
    }
    if (res.ok) break;
    // Server-side log only (never sent to the browser).
    console.error(`[gemini] ${models[i]} ${res.status} ${json?.error?.message ?? ""}`.slice(0, 300));
    if (res.status !== 404 && !TRANSIENT.includes(res.status)) break;
  }

  if (!res || !res.ok) {
    if (timedOut) throw new Error("The AI is busy right now. Try again in a minute");
    const status = res?.status ?? 0;
    if (status === 404) throw new Error(`Model not found: ${models.join(", ")}`);
    if (TRANSIENT.includes(status)) throw new Error("The AI is busy right now. Try again in a minute");
    throw new Error(`Gemini error ${status}: ${json?.error?.message ?? "unknown"}`);
  }

  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p) => p.text ?? "").join("");
  if (!text) throw new Error("Gemini returned no text");
  return text;
}
