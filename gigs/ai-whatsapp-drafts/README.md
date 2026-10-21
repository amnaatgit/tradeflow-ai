# AI WhatsApp Message Drafts (Gemini) for Next.js

One component and one API route that write **ready-to-send WhatsApp messages for small sellers**: order confirmations, payment reminders, "out for delivery" and thank-you notes, in **Roman Urdu, Urdu or English**. The seller picks a language (and a friendly or firm tone for reminders), edits the draft, then taps **Copy** or **Open WhatsApp**.

Extracted from **TradeFlow AI**, where it writes confirmations on the receipt page and reminders on the khata (ledger) page.

## Why it's useful

- **Sounds like a real Pakistani seller**: natural Roman Urdu ("Aap ka order confirm ho gaya hai") or English or Urdu script, short enough for WhatsApp.
- **Safe**: the AI only gets structured order facts (items, totals, due), never the raw chat. The prompt forbids inventing dates, bank details, discounts or links, and the output is validated with **zod** (1–700 chars, retried up to 2 times).
- **Never stuck**: if Gemini is busy, it tries **fallback models** in order, and if all fail it returns a **standard template**, so the UI always has a message.
- **Human in the loop**: nothing is sent automatically. The seller edits, then copies or opens WhatsApp (`wa.me` link with the text filled in).
- **Cheap**: one short call per message on Gemini Flash-Lite.

## Files

| File | What it does |
|---|---|
| `components/ai-message-box.tsx` | The UI: language/tone, "Write with AI", editable draft, Copy, Open WhatsApp |
| `app/api/draft/route.ts` | POST route: validates input, rate limits, calls the AI, falls back to a template |
| `lib/ai/draft.ts` | Prompt + zod schemas + retries (`draftMessage`) |
| `lib/ai/gemini.ts`, `lib/ai/config.ts` | Gemini REST call (JSON mode) with the model fallback chain |
| `lib/templates.ts` | Offline templates for all 4 kinds × 2 languages |
| `lib/whatsapp.ts` | Pakistani number → `wa.me` link |
| `example.ts` | Server-side use without the UI |

## Setup

1. `npm i zod`
2. Copy `lib/`, `components/` and `app/api/draft/` into your Next.js app.
3. Add `GEMINI_API_KEY` to `.env.local` (free key from Google AI Studio). Server only; it is never sent to the browser.
4. Add your auth check at the top of `app/api/draft/route.ts` (marked TODO).

## Use it

```tsx
<AiMessageBox
  kind="confirmation"
  phone="0300-1234567"
  facts={{
    shop_name: "Ayesha Collection",
    customer_name: "Sara",
    items: [{ name: "lawn suit (blue)", qty: 1, unit_price: 3200 }],
    total: 3450, advance: 1000, due: 2450,
    address: "Flat 4B, Gulshan-e-Iqbal, Karachi",
  }}
/>

<AiMessageBox kind="reminder" phone={customer.phone} facts={{ customer_name: customer.name, due: balance }} />
```

Need auth headers? Pass `fetcher={(url, body) => yourAuthFetch(url, body)}`.

### Real output from our tests (Roman Urdu, reminder, friendly, due Rs 5,800)

> Assalam-o-Alaikum Test Customer!
>
> Umeed hai aap theek honge. Yeh yaad delana tha ke aap ke order ki Rs 5,800 ki payment rehti hai.
>
> Jub waqt milay please clearance karwa dein. Shukriya!

The English confirmation for an order in the same test thanked the customer, listed both items with quantities, then Total Rs 7,800, Advance received Rs 1,000, Due on delivery Rs 6,800 and the delivery address.

## Contributors

Amna Shahzad, Mania Ashar and Bisma Shahid. MIT licensed.
