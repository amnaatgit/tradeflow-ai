import { generate } from "./gemini";
import { ExtractionSchema, type Extraction } from "../schema";

const systemPrompt = `You read one customer's order chat sent to a Pakistani online seller (WhatsApp or Instagram). The chat may be in English, Roman Urdu (Urdu in Latin letters) or a mix.

Return only one JSON object with exactly these keys:
customer_name (string or null), phone (string or null), address (string or null), area (string or null),
items (array of { "name": string, "qty": whole number, "unit_price": number or null }),
advance (number or null),
confidence: { "customer_name", "phone", "address", "items", "advance" }, each a number from 0 to 1.

Rules:
- Use only what the chat says. Never invent a name, phone, address, area or price. Anything not stated is null with confidence 0.
- Turn number words and units into numbers: ek 1, do 2, teen 3, char 4, panch 5, darjan or dozen 12, sau 100, hazar or hazaar or k 1000 ("2 hazar" = 2000, "1.5k" = 1500).
- One item per product variant. Put size and colour in the name, for example "red kurta (M)".
- unit_price is the price of one piece. If only a line total is given, divide it by qty. Never use the advance as a price.
- advance is money the customer already paid or sent (diya, bhej diya, transfer kar diya, paid, advance). A price is not an advance. Cash on delivery means advance is null.
- address is the delivery address as written. area is only the locality from it (for example "Gulshan block 5", "DHA Phase 6", "Johar Town").
- phone: copy the digits as written.
- confidence: 0.9 or more when clearly stated, 0.4 to 0.7 when you had to guess or the text is ambiguous, 0 when the value is null.
- If the text is not an order, return every field null, items [] and every confidence 0.

Example 1 (Roman Urdu)
Chat: "Assalam o alaikum, Ali bol raha hun. 2 darjan chai cups aur 3 spoons chahiye, cup 150 ka. Address house 123, Shadman phase 2, Lahore. Number 0300-1234567. 500 advance bhej diya hai"
JSON: {"customer_name":"Ali","phone":"0300-1234567","address":"house 123, Shadman phase 2, Lahore","area":"Shadman phase 2","items":[{"name":"chai cups","qty":24,"unit_price":150},{"name":"spoons","qty":3,"unit_price":null}],"advance":500,"confidence":{"customer_name":0.9,"phone":0.95,"address":0.95,"items":0.75,"advance":0.9}}

Example 2 (English)
Chat: "Hi, I want 1 black abaya size L for 3500 and 2 hijabs 450 each. Deliver to Flat 4B, Block 13-D, Gulshan-e-Iqbal, Karachi. Cash on delivery. Sara 0321 7654321"
JSON: {"customer_name":"Sara","phone":"0321 7654321","address":"Flat 4B, Block 13-D, Gulshan-e-Iqbal, Karachi","area":"Gulshan-e-Iqbal","items":[{"name":"black abaya (L)","qty":1,"unit_price":3500},{"name":"hijab","qty":2,"unit_price":450}],"advance":null,"confidence":{"customer_name":0.85,"phone":0.95,"address":0.95,"items":0.95,"advance":0}}`;

function stripFences(text: string): string {
  return text.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
}

// Calls the model and validates its JSON with zod. Up to 2 retries on invalid output.
export async function parseOrder(chat: string) {
  const base = `Chat: ${JSON.stringify(chat)}\nJSON:`;
  let user = base;
  let raw: unknown = null;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const text = await generate(systemPrompt, user);
    try {
      raw = JSON.parse(stripFences(text));
      const data: Extraction = ExtractionSchema.parse(raw);
      return { success: true as const, data, raw };
    } catch (err) {
      lastError = err;
      const reason = err instanceof Error ? err.message.slice(0, 300) : "invalid JSON";
      user = `${base}\n\nYour previous reply was not valid (${reason}). Reply with only the JSON object in the exact format described.`;
    }
  }
  return { success: false as const, error: String(lastError), raw };
}
