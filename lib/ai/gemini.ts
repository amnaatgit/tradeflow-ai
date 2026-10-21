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

  // First try the configured model
  let res = await call(MODEL, system, user, apiKey);

  // If model not found (retired/renamed) try the fallback once
  if (res.status === 404) {
    res = await call(FALLBACK_MODEL, system, user, apiKey);
    if (res.status === 404) {
      throw new Error(`Model not found: ${MODEL} and fallback ${FALLBACK_MODEL}`);
    }
  }

  // If we still have an error status that's transient, and we haven't tried fallback yet, attempt fallback once
  const transientStatuses = [429, 500, 503];
  if (!res.ok && transientStatuses.includes(res.status)) {
    // try fallback once if we haven't already
    if (res.url?.includes(MODEL)) {
      res = await call(FALLBACK_MODEL, system, user, apiKey);
    }
  }

  const json: any = await res.json().catch(() => ({}));

  if (!res.ok) {
    // For final transient server errors, give a friendly busy message
    if (transientStatuses.includes(res.status)) {
      throw new Error("The AI is busy right now. Try again in a minute");
    }
    // Other errors
    throw new Error(`Gemini error ${res.status}: ${json?.error?.message ?? "unknown"}`);
  }

  const parts: { text?: string }[] = json?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p) => p.text ?? "").join("");
  if (!text) throw new Error("Gemini returned no text");
  return text;
}
