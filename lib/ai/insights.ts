import { z } from "zod";
import { generate } from "./gemini";

export const InsightsInput = z.object({
  language: z.enum(["roman_urdu", "english"]),
  orders_30d: z.number().min(0),
  sales_30d: z.number().min(0),
  pending_orders: z.number().min(0),
  to_collect: z.number().min(0),
  top_items: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        qty: z.number().min(0),
      })
    )
    .max(5),
  top_areas: z
    .array(
      z.object({
        area: z.string().min(1).max(120),
        orders: z.number().min(0),
      })
    )
    .max(3),
  top_dues: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        due: z.number().min(0),
      })
    )
    .max(3),
});

export type InsightsInputType = z.infer<typeof InsightsInput>;

const InsightsOutput = z.object({
  tips: z.array(z.string().min(1).max(200)).min(2).max(4),
});

const system = `You are a business assistant for a small Pakistani online seller.
Write exactly 3 short, practical tips for running their shop based ONLY on the
numbers provided below.

Rules:
- Each tip under 160 characters.
- Use only the numbers, names, areas and amounts given in the input.
- Mention real customer names, areas and rupee amounts from the input when useful.
- Never invent any numbers, dates, discounts, offers, links or shop names.
- Do not reference any external tools or websites.
- language roman_urdu: natural Pakistani Roman Urdu in Latin letters.
- language english: simple, clear English.
- Focus on practical actions they can take in the next few days.

Return ONLY JSON: {"tips": ["tip1", "tip2", "tip3"]}.`;

export async function getInsights(input: InsightsInputType): Promise<{ tips: string[] }> {
  const lines: string[] = [];
  lines.push(`language: ${input.language}`);
  lines.push(`orders_30d: ${input.orders_30d}`);
  lines.push(`sales_30d: ${input.sales_30d}`);
  lines.push(`pending_orders: ${input.pending_orders}`);
  lines.push(`to_collect: ${input.to_collect}`);

  if (input.top_items.length) {
    lines.push(
      "top_items: " +
        input.top_items.map((it) => `${it.name} (qty ${it.qty})`).join("; ")
    );
  }

  if (input.top_areas.length) {
    lines.push(
      "top_areas: " +
        input.top_areas.map((a) => `${a.area} (${a.orders} orders)`).join("; ")
    );
  }

  if (input.top_dues.length) {
    lines.push(
      "top_dues: " +
        input.top_dues.map((d) => `${d.name}: Rs ${d.due}`).join("; ")
    );
  }

  const user = lines.join("\n");

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const text = await generate(system, user);
    try {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      const json = JSON.parse(start >= 0 && end > start ? text.slice(start, end + 1) : text);
      return InsightsOutput.parse(json);
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(`Invalid AI output: ${String(lastError)}`);
}
