"use client";

// Browser helpers: turn a picked file into { mimeType, data } for the parse route.

/** Screenshots: resize so the longest side is <= 1600px and re-encode as JPEG (small, fast, readable). */
export async function imageToMedia(file: File, maxSide = 1600, quality = 0.8): Promise<{ mimeType: string; data: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * ratio);
    canvas.height = Math.round(img.height * ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { mimeType: "image/jpeg", data: canvas.toDataURL("image/jpeg", quality).split(",")[1] ?? "" };
  } finally {
    URL.revokeObjectURL(url);
  }
}

const AUDIO_BY_EXT: Record<string, string> = {
  opus: "audio/ogg", ogg: "audio/ogg", m4a: "audio/mp4", mp4: "audio/mp4",
  mp3: "audio/mpeg", wav: "audio/wav", aac: "audio/aac", webm: "audio/webm",
};

/** Voice notes (WhatsApp exports .opus): max 3 MB, mime type from the file or its extension. */
export async function audioToMedia(file: File, maxBytes = 3 * 1024 * 1024): Promise<{ mimeType: string; data: string }> {
  if (file.size > maxBytes) throw new Error("Voice note is too big (max 3 MB)");
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = file.type || AUDIO_BY_EXT[ext] || "";
  if (!mimeType) throw new Error("Unknown audio type");
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
  return { mimeType, data: dataUrl.split(",")[1] ?? "" };
}
