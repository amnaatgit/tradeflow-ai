---
name: order-parsing
description: Extract structured orders from English or Roman Urdu chat snippets using the AI parser. Use when improving or editing /api/parse or lib/ai/parse.ts
---

When to use
- Add or refine prompts that handle Roman Urdu, mixed-language chats, and number-word normalization.

Guidance
- Convert common Urdu number words (ek, do, teen, char, paanch, doz(en)) to integers.
- Parse money shorthand (1k, 2k, hazaar) into numeric values (1000, etc.).
- If a field (name, phone, address, price) is not explicitly present, return null with low confidence — do not invent values.
- Provide two few-shot examples: one Roman Urdu and one English.
- Validate the model output against lib/schema.ts (zod) and retry parsing malformed JSON up to two times before surfacing a friendly error and allowing manual entry.