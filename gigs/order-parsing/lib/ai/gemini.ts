const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function call(model: string, body: any, apiKey: string) {
  return fetch(`${BASE}/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body),
  });
}

export async function generateWithFallback(model: string, fallback: string, body: any, apiKey: string): Promise<string> {
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  let res = await call(model, body, apiKey);
  // model not found -> retry once with fallback
  const isNotFound = async (r: Response) => {
    if (r.status === 404) return true;
    try {
      const j = await r.clone().json().catch(() => ({}));
      if (j?.error?.message && /not found/i.test(j.error.message)) return true;
    } catch { }
    return false;
  };

  if (await isNotFound(res)) {
    res = await call(fallback, body, apiKey);
    if (await isNotFound(res)) throw new Error('MODEL_NOT_FOUND');
  }

  // transient statuses -> try fallback once if didn't already
  const transient = [429, 500, 503];
  if (!res.ok && transient.includes(res.status)) {
    res = await call(fallback, body, apiKey);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Gemini error ${res.status}: ${text}`);
  }

  const json = await res.json().catch(() => ({}));
  const parts: { text?: string }[] = json?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map(p => p.text ?? '').join('');
  return text;
}
