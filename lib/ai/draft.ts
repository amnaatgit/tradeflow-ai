import { z } from "zod";
import { generate } from "./gemini";

export const DraftInput = z.object({
  kind: z.enum(["confirmation", "reminder"]),
  language: z.enum(["roman_urdu", "english"]),
  tone: z.enum(["friendly", "firm"]).default("friendly"),
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
- At most 6 short lines. Warm and polite, like a real small seller.
- Use only the facts given. Never invent dates, delivery times, bank or account numbers, discounts, links or a shop name.
- Write money as "Rs 3,200".
- language roman_urdu: natural Pakistani Roman Urdu in Latin letters (for example "Aap ka order confirm ho gaya hai"). language english: simple English.
- kind confirmation: thank the customer, list the items with quantities, then the total, the advance received (if any) and the amount due on delivery, and the delivery address if given.
- kind reminder: remind the customer of the amount due. tone friendly is gentle; tone firm asks clearly for payment soon but stays respectful, with no threats.
Return only JSON: {"message": "..."}`;

// Writes a message draft from the order numbers only. The seller edits and sends it manually.
export async function draftMessage(input: DraftInputType): Promise<{ message: string }> {
  const lines = [`kind: ${input.kind}`, `language: ${input.language}`, `tone: ${input.tone}`];
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
  const user = lines.join("\n");

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const text = await generate(system, user);
    try {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      const parsed = JSON.parse(start >= 0 && end > start ? text.slice(start, end + 1) : text);
      return DraftOutput.parse(parsed);
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`Invalid AI output: ${String(lastError)}`);
}
