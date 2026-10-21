import { z } from "zod";
import { generate } from "./gemini";

export const DraftKind = z.enum(["confirmation", "reminder", "out_for_delivery", "thank_you"]);
export const DraftInput = z.object({
  kind: DraftKind,
  language: z.enum(["roman_urdu", "english", "urdu"]).default("roman_urdu"),
  tone: z.enum(["friendly", "firm"]).default("friendly"),
  shop_name: z.string().max(60).nullable().optional(),
  customer_name: z.string().max(100).nullable().optional(),
  items: z
    .array(z.object({ name: z.string().max(120), qty: z.number(), unit_price: z.number().nullable() }))
    .max(50)
    .optional(),
  total: z.number().nullable().optional(),
  advance: z.number().nullable().optional(),
  paid: z.number().nullable().optional(),
  due: z.number().nullable().optional(),
  address: z.string().max(300).nullable().optional(),
});
export type DraftInputType = z.infer<typeof DraftInput>;

const DraftOutput = z.object({ message: z.string().min(1).max(700) });

const system = `You write one short WhatsApp message from a Pakistani home-business seller to a customer.
Rules:
- At most 6 short lines. Warm and polite, like a real small seller. Emojis: at most one.
- Use only the facts given. Never invent dates, delivery times, bank or account numbers, discounts, links or tracking numbers.
- Write money as "Rs 3,200".
- language roman_urdu: natural Pakistani Roman Urdu in Latin letters ("Aap ka order confirm ho gaya hai"). english: simple English. urdu: Urdu script.
- kind confirmation: thank the customer, list items with quantities, then total, advance received (if any), amount due on delivery, and the address if given.
- kind reminder: remind the customer of the amount due. tone friendly is gentle; tone firm asks clearly for payment soon but stays respectful, with no threats.
- kind out_for_delivery: tell the customer the order has been sent and the amount to keep ready (due), if any.
- kind thank_you: thank the customer for receiving the order and invite them to order again.
- If shop_name is given, sign off with it.
Return only JSON: {"message": "..."}`;

function factsFor(input: DraftInputType): string {
  const lines = [`kind: ${input.kind}`, `language: ${input.language}`, `tone: ${input.tone}`];
  if (input.shop_name) lines.push(`shop_name: ${input.shop_name}`);
  if (input.customer_name) lines.push(`customer_name: ${input.customer_name}`);
  if (input.items?.length) {
    lines.push(
      "items: " +
        input.items.map((it) => `${it.qty} x ${it.name}${it.unit_price != null ? ` @ Rs ${it.unit_price}` : ""}`).join("; ")
    );
  }
  if (input.total != null) lines.push(`total: ${input.total}`);
  if (input.advance) lines.push(`advance: ${input.advance}`);
  if (input.paid) lines.push(`paid: ${input.paid}`);
  if (input.due != null) lines.push(`due: ${input.due}`);
  if (input.address) lines.push(`address: ${input.address}`);
  return lines.join("\n");
}

// Writes a draft from structured order facts (not the raw chat). The seller edits and sends it
// manually. Throws if the AI is unavailable: use draftFallback() then.
export async function draftMessage(input: DraftInputType): Promise<{ message: string }> {
  const user = factsFor(input);
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const text = await generate(system, user);
    try {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      return DraftOutput.parse(JSON.parse(start >= 0 && end > start ? text.slice(start, end + 1) : text));
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`Invalid AI output: ${String(lastError)}`);
}
