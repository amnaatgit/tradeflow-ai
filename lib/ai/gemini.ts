import { MODEL, FALLBACK_MODEL } from "./config";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function call(model: string, system: string, user: string, apiKey: string) {
  return fetch(`${BASE}/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 4096 },
    }),
  });
}

// One Gemini generateContent call. Returns the model's text (JSON as a string).
export async function generate(system: string, user: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  let res = await call(MODEL, system, user, apiKey);
  // Model retired or renamed: try the fallback once.
  if (res.status === 404) res = await call(FALLBACK_MODEL, system, user, apiKey);

  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 429) throw new Error("AI is busy, try again in a minute");
    throw new Error(`Gemini error ${res.status}: ${json?.error?.message ?? "unknown"}`);
  }

  const parts: { text?: string }[] = json?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p) => p.text ?? "").join("");
  if (!text) throw new Error("Gemini returned no text");
  return text;
}
