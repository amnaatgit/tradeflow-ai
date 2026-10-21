# Roman Urdu Order Parser: text, screenshot or voice note → order JSON (Gemini + zod)

Pakistani sellers get orders as messy WhatsApp/Instagram chats, as **chat screenshots** and as **voice notes**, in English, Roman Urdu or a mix. This kit turns any of them into **clean, validated order JSON**: customer, phone, address, area, items (qty + unit price), advance paid, a **per-field confidence score**, and a **transcript** of what the AI read or heard.

Extracted from **TradeFlow AI**, where it powers the "New order" screen.

## Real results (from our live tests)

**Typed chat:**
> Assalam o alaikum, Bilal bol raha hun. 3 kurtay chahiye medium size, 1800 ka ek. Address flat 7, Gulshan block 13, Karachi. Number 0333-1112233. 1000 advance bhej diya

→ `customer_name: "Bilal"`, `phone: "0333-1112233"`, `area: "Gulshan block 13"`, `items: [{ name: "kurta (medium)", qty: 3, unit_price: 1800 }]`, `advance: 1000`

**WhatsApp screenshot** (customer and seller messages, Roman Urdu):
→ `customer_name: "Ayesha"`, `phone: "0321-4455667"`, `address: "DHA phase 5, house 22 street 7 Karachi"`, items: blue lawn suit × 1 @ 3200, pink lawn suit × 1 @ 3200, dupatta × 1 @ 850, **Delivery charges × 1 @ 250** (from the seller's reply), `advance: 1000`, plus a transcript of the customer's lines.

## What makes it reliable

- **Understands how customers write**: number words (*do, teen, darjan, 2 hazar, 1.5k*), sizes and colours as separate items, line totals divided into unit prices, advance vs price.
- **Never invents data**: missing values are `null` with confidence 0. Show anything below 0.7 in yellow for the seller to check.
- **Validated output**: every response is checked with **zod** and retried up to 2 times on bad JSON. On a retry **the screenshot or voice note is sent again**, so the second try is not blind.
- **Keeps working when Gemini is busy**: tries a chain of fallback models on 404/429/500/503 (`lib/ai/config.ts`).
- **Files are not stored**: screenshots and voice notes go inline to Gemini and are discarded.
- **Ready-made browser helpers**: resize screenshots to ≤1600px JPEG and read WhatsApp `.opus` voice notes (`lib/client/file-to-media.ts`).

## Files

| File | Purpose |
|---|---|
| `lib/ai/parse.ts` | `parseOrder(chat, media?)`: the tuned prompt (Roman Urdu + English examples), retries and validation |
| `lib/ai/gemini.ts` | Gemini REST call in JSON mode, inline image/audio, model fallback chain |
| `lib/schema.ts` | zod schema + `Extraction` type |
| `lib/media.ts` | Server check of file type/size; accepts data URLs |
| `lib/client/file-to-media.ts` | Browser: `imageToMedia(file)`, `audioToMedia(file)` |
| `app/api/parse/route.ts` | Ready Next.js POST route (`{ chat?, media? }`) |
| `example.ts` | Server-side usage |

## Setup

1. `npm i zod`
2. Copy `lib/` and `app/api/parse/` into your Next.js (or any Node 18+) app.
3. Set `GEMINI_API_KEY` (free from Google AI Studio). Server only.
4. Add your auth check and rate limit at the top of the route (marked TODO).

## Use it from the browser

```ts
import { imageToMedia, audioToMedia } from "@/lib/client/file-to-media";

const media = file.type.startsWith("image/") ? await imageToMedia(file) : await audioToMedia(file);
const res = await fetch("/api/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat: "", media }) });
const order = await res.json(); // { customer_name, phone, address, area, items, advance, transcript, confidence }
```

## Tips

- Let the seller confirm before saving, and do money math in your own code (qty × unit_price). The AI only extracts.
- Normalise phones before matching customers (see our **pk-commerce-utils** gig).

## Contributors

Amna Shahzad, Mania Ashar and Bisma Shahid. MIT licensed.
