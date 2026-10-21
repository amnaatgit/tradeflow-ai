import { parseOrder } from "./lib/ai/parse";

// Text chat
export async function fromText() {
  const res = await parseOrder(
    "Assalam o alaikum, Bilal bol raha hun. 3 kurtay chahiye medium size, 1800 ka ek. Address flat 7, Gulshan block 13, Karachi. Number 0333-1112233. 1000 advance bhej diya"
  );
  if (res.success) console.log(res.data); // typed Extraction
}

// Screenshot or voice note (base64 without the data: prefix)
export async function fromFile(base64: string, mimeType: "image/jpeg" | "audio/ogg") {
  const res = await parseOrder("", { mimeType, data: base64 });
  if (res.success) console.log(res.data.transcript, res.data.items);
}
