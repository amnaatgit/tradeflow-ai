// Server-side checks for files sent to the parser (base64, inline to Gemini, never stored).
export const ALLOWED_MEDIA = [
  "image/jpeg", "image/png", "image/webp",
  "audio/ogg", "audio/mpeg", "audio/mp4", "audio/aac", "audio/wav", "audio/webm",
] as const;
export const MAX_BASE64_CHARS = 4_000_000; // ~3 MB file; keeps requests under typical 4.5 MB body limits

export type Media = { mimeType: string; data: string };

export function validateMedia(input: unknown): { ok: true; media: Media } | { ok: false; status: 400 | 413; error: string } {
  const m = input as { mimeType?: unknown; data?: unknown } | null;
  if (!m || typeof m.mimeType !== "string" || typeof m.data !== "string") {
    return { ok: false, status: 400, error: "Invalid file" };
  }
  let data = m.data;
  if (data.startsWith("data:")) data = data.slice(data.indexOf(",") + 1); // accept data URLs too
  if (!(ALLOWED_MEDIA as readonly string[]).includes(m.mimeType)) return { ok: false, status: 400, error: "Unsupported file type" };
  if (data.length > MAX_BASE64_CHARS) return { ok: false, status: 413, error: "File too large" };
  return { ok: true, media: { mimeType: m.mimeType, data } };
}
