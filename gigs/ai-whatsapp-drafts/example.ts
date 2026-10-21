// Server-side usage without the UI (e.g. in a cron job or another API route).
import { draftMessage } from "./lib/ai/draft";
import { draftFallback } from "./lib/templates";

const facts = {
  kind: "confirmation" as const,
  language: "roman_urdu" as const,
  tone: "friendly" as const,
  shop_name: "Ayesha Collection",
  customer_name: "Sara",
  items: [
    { name: "lawn suit (blue)", qty: 1, unit_price: 3200 },
    { name: "dupatta", qty: 1, unit_price: 850 },
  ],
  total: 4300,
  advance: 1000,
  due: 3300,
  address: "Flat 4B, Gulshan-e-Iqbal, Karachi",
};

export async function run() {
  try {
    const { message } = await draftMessage(facts);
    return message;
  } catch {
    return draftFallback(facts);
  }
}
