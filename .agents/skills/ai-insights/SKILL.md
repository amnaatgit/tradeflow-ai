---
name: ai-insights
description: How /api/insights turns dashboard stats into short AI-written tips for the seller.
---

Summary
- Purpose: generate three short, practical tips for the seller based only on their own numbers.
- Surfaces on: the "AI tips for your shop" card on the Dashboard.

API contract (/api/insights)
- Method: POST only.
- Auth: same pattern as /api/parse and /api/draft.
  - Token in body (accessToken) or Bearer header.
  - Validated with getAccessToken() + requireUser().
  - If the account has any verified 2FA factor but the token AAL is not aal2, returns 403 { error: "Enter your 2FA code first" }.
- Rate limit: 5 requests/minute per user id (simple in-memory bucket).

Request body (validated with zod as InsightsInput)
- language: "roman_urdu" | "english".
- orders_30d: number (non-negative) — count of non-cancelled orders in the last 30 days.
- sales_30d: number (non-negative) — total sales from those orders (computed in code).
- pending_orders: number (non-negative) — current pending orders.
- to_collect: number (non-negative) — total positive khata balance across customers.
- top_items: up to 5 objects { name: string, qty: number }.
- top_areas: up to 3 objects { area: string, orders: number }.
- top_dues: up to 3 objects { name: string, due: number }.

Model and prompt (lib/ai/insights.ts)
- Calls generate() from lib/ai/gemini.ts (no direct provider calls).
- System prompt:
  - Acts as a business assistant for a Pakistani online seller.
  - Must write exactly 3 tips, each under 160 characters.
  - Must only use numbers, names and areas from the input; never invents numbers, dates, discounts, offers or links.
  - language roman_urdu: Roman Urdu in Latin letters. language english: simple English.
  - Response format: JSON { "tips": ["tip1", "tip2", "tip3"] }.
- Output validation:
  - zod schema: tips: string[2..4], each 1–200 chars.
  - The function getInsights() retries up to 2 times (3 attempts total) if parsing/validation fails.
  - On repeated failure it throws an Error; the API turns this into a 503 with a friendly message.

Client behaviour (Dashboard card)
- Builds the InsightsInput from real Supabase numbers:
  - orders_30d and sales_30d from last 30 days of non-cancelled orders.
  - pending_orders from the existing "To dispatch" count.
  - to_collect and top_dues from customerBalance() in lib/calc.ts.
  - top_items from order_items quantities; top_areas from recent orders by area.
- Sends a POST via apiFetch("/api/insights", body) so the access token goes in the JSON body.
- Shows a loading state ("Thinking…"), then displays numbered tips.
- On API error or AI failure shows the error message but does not retry automatically.

Safety notes
- No AI output is stored server-side; tips are ephemeral and rendered in the UI only.
- Money calculations always come from lib/calc.ts and Supabase rows, never from the AI.
- The model cannot add links or hidden promotions; tips stay generic and numbers-only.
