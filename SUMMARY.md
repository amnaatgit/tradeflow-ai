TradeFlow AI — Handover for a new builder

This document is a complete handover for a new developer joining the project. It explains what the app is, who it serves, how each page works, the data model and migrations, money rules, auth and AI behaviour, environment variables, known limitations and recommended next steps.

What the app does and who it's for
- TradeFlow AI is a mobile-first seller tool for Pakistani social-commerce micro-sellers. Sellers receive orders over chat (WhatsApp / Instagram) and often as screenshots or voice notes. The app extracts structured orders from messy chats using a server-side AI parser, presents an editable review to the seller, and only saves the order when the seller confirms. It also maintains a per-customer khata (credit ledger), produces printable receipts, area-grouped dispatch lists, and generates editable AI-written WhatsApp drafts for confirmations and reminders.

Primary actors
- Seller (signed-in user): pastes chats, uploads screenshots or voice notes, reviews AI extractions, confirms and saves orders, records payments and sends reminders manually.
- Server AI parser: server-side route /api/parse that calls the configured model(s) and returns validated JSON extractions.

Pages and what they show/do
- / (root) — public landing page placeholder (not part of core seller flows; can be implemented later).

- Dashboard (app/(app)/dashboard/page.tsx)
  - Shows recent orders, today's orders count, total pending balance and top areas by pending amount. Useful at-a-glance metrics for the seller.

- New Order (/orders/new)
  - Input: a free-text textarea where the seller pastes a chat, plus optional attachment buttons for a screenshot (image) or a voice note (audio).
  - Behaviour: client posts { chat, media? } to /api/parse. The server authenticates the request (token-in-body) and returns a validated extraction (customer_name, phone, address, area, items[], advance, confidence object, transcript when media provided). The client shows an editable review card with highlighted fields:
    - Any field that is null or confidence < 0.7 is highlighted (yellow) for the seller to edit.
    - Items are shown as editable rows; unit_price must be filled before saving.
    - The seller can edit the raw text and the AI-read transcript ("What the AI read / heard") when media was provided.
  - Attachments: images are resized on the client to a longest side of 1600px and exported as JPEG quality 0.8; audio files are limited to 3 MB and read as base64. The client sends media.data as base64 without a "data:" prefix; the server accepts and strips a data: prefix if present.
  - Nothing is saved until the seller taps "Confirm & save". On save the client (browser) uses the Supabase browser client (lib/supabase/client.ts) to insert or reuse a customer, create the order (raw_text, address, area, advance, ai_extraction including confidence), and insert order_items. RLS enforces row ownership.

- Orders list (/orders)
  - Lists the user's orders with customer, area, total, status and date. Search and filters are available for area, status and date range. Each item links to the order detail.

- Order detail (/orders/[id])
  - Shows the full order: items, quantities, prices, advance, payments, notes, AI extraction JSON and a printable receipt link. Actions include marking delivered (records Cash payment if collected), cancelling the order and editing order items.

- Receipt (/orders/[id]/receipt)
  - Printable receipt that includes items, qtys, prices, advance, balance due and payment methods. Includes a "WhatsApp confirmation" card (hidden when printing) that lets the seller generate an AI-written confirmation message (Roman Urdu or English), edit it, copy or open WhatsApp to send manually.

- Dispatch (/dispatch)
  - Shows pending orders grouped by area with per-group totals and print-friendly lists for riders. Default view shows pending orders only. "Mark delivered" marks an order as delivered and records the Cash payment when the rider collects cash.

- Khata list (/khata)
  - Customer ledger showing balances. Each customer row shows name, phone, area and current balance. Balances exclude cancelled orders.

- Khata customer page (/khata/[id])
  - Shows payment history and pending orders for the customer. Provides a form to record a payment. Includes "Write reminder with AI" controls when the balance is positive: language and tone selects (Roman Urdu default, English; Friendly or Firm) and a "Write reminder with AI" button that generates an editable draft via /api/draft.

- Auth pages (app/auth/*)
  - Sign up: email + password. After sign-up the user is told to check their email for confirmation; the app does not assume a session exists until the user signs in.
  - Sign in: email + password (if the account has TOTP 2FA enabled, the 2FA code is required). The code flow and 2FA setup use components/MfaSetup.tsx and components/MfaVerify.tsx from the gigs/supabase-auth-2fa gig.
  - No server-side auth middleware is used. Client pages are protected with components/auth-guard.tsx which redirects or shows UI for unauthenticated users.

Data model (public schema)
- All core tables enforce ownership via row-level security (RLS) and include user_id uuid references auth.users default auth.uid():
  - customers
    - id uuid primary key
    - user_id uuid not null default auth.uid()
    - name text not null
    - phone text (nullable)
    - area text (nullable)
    - created_at timestamptz default now()
    - Unique constraint: (user_id, phone) when phone is not null.
  - orders
    - id uuid primary key
    - user_id uuid not null default auth.uid()
    - customer_id uuid references customers(id)
    - raw_text text
    - address text
    - area text
    - advance numeric default 0
    - status text default 'pending' (pending | delivered | cancelled)
    - ai_extraction jsonb (raw model output and confidence)
    - created_at timestamptz default now()
  - order_items
    - id uuid primary key
    - order_id uuid references orders(id) on delete cascade
    - name text not null
    - qty int not null check (qty > 0)
    - unit_price numeric not null check (unit_price >= 0)
  - payments
    - id uuid primary key
    - customer_id uuid references customers(id)
    - order_id uuid nullable
    - amount numeric not null check (amount > 0)
    - method text nullable -- new column added in migrations (payments.method)

Migrations
- The project's SQL migrations live in supabase/migrations/. Review them to see the step-by-step schema changes. Important migration notes:
  - Every table enables row-level security and creates policies that only allow the owner (auth.uid()) to select/insert/update/delete their rows.
  - A recent migration added payments.method (text) to record how the payment was made (cash, bank, easypaisa, jazzcash, other).

Money rules and calculations (lib/calc.ts)
- Order total = sum(items.map(i => i.qty * i.unit_price)).
- balanceDue on an order = total - advance - paymentsAppliedToOrder.
- customerBalance = sum(balanceDue of non-cancelled orders) - payments not linked to orders.
- Dispatch allocation: when marking delivered with cash collected, a Cash payment is recorded and dispatch calculations subtract payments already received. Khata payments apply to the oldest unpaid orders by default.

Auth and security
- No middleware-based or cookie-based auth. Browser-based read/writes use the Supabase browser client (lib/supabase/client.ts) and RLS controls access.
- Server routes that need to know who is calling (for example /api/parse and /api/draft) accept an access token in the request body. They validate it with getAccessToken(req, body) and requireUser() from lib/supabase/server.ts. This keeps routes stateless and compatible with the preview environment.
- Optional TOTP 2FA: accounts can enable TOTP (QR + code verification). Once enabled, sign-in requires the code. The API enforces 2FA for actions when the account has it enabled.

AI: architecture and behaviour
- AI adapter: lib/ai/gemini.ts is the single entrypoint for model calls. Model names and fallback chains are centralized in lib/ai/config.ts (DEFAULT_MODEL, FALLBACK_MODELS and MODEL = process.env.AI_MODEL || DEFAULT_MODEL). All calls go through lib/ai/gemini.ts. Do not call models from other files.
- /api/parse (app/api/parse/route.ts)
  - Accepts POST { chat?: string, media?: { mimeType: string, data: string } } where media.data is base64 without the data: prefix (server also accepts and strips data: URLs).
  - Allowed mime types: image/jpeg, image/png, image/webp, audio/ogg, audio/mpeg, audio/mp4, audio/aac, audio/wav, audio/webm. Rejects unsupported types or oversized payloads.
  - Validates non-empty input (chat or media), rejects chat > 4000 chars.
  - Enforces an in-memory per-user rate limit (10 requests / minute).
  - Calls lib/ai/parse.ts which constructs prompts for English, Roman Urdu and mixed chats, includes two few-shot examples, converts number words to numbers, and returns transcript when media provided.
  - Responses are validated with zod (lib/schema.ts). The server retries invalid JSON up to 2 times; on persistent failures it returns a friendly error so the client can fall back to manual entry.

- /api/draft (app/api/draft/route.ts)
  - Generates short WhatsApp message drafts for confirmations and reminders using lib/ai/draft.ts which in turn calls lib/ai/gemini.ts. Draft generation is rate-limited per user (20 / minute) and validated with zod. The seller edits and sends drafts manually; nothing is auto-sent.

- Media support
  - When media is present, parse attempts read the customer's words (for audio) or reads text from screenshots. The AI output includes a transcript field (Roman Urdu or English in Latin letters) and the extraction JSON.

Environment variables
- The project expects the following env vars (see .env.example):
  - NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (for browser Supabase client)
  - SUPABASE_URL, SUPABASE_ANON_KEY (server-side Supabase if used)
  - AI_MODEL (optional override; fallbacks are configured in lib/ai/config.ts)
  - GEMINI_API_KEY or other provider key set in Secrets. Do not commit keys.

Known limitations
- Voice-to-text is model-dependent and may not be perfect for heavy Urdu code-switching; the transcript should be edited by the seller.
- Receipt and print layouts are CSS-only; complex print workflows (PDF generation) are not supported.
- No payment gateway integrations — payments are recorded manually.
- Some UI pages and the public landing page are minimal and intended for future polish.

Developer conventions and rules
- All server-side calls that need authentication must call getAccessToken(req, body) and requireUser() from lib/supabase/server.ts. The token-in-body transport is used to avoid preview proxy cookie stripping.
- Browser reads/writes use createClient() from lib/supabase/client.ts and rely on RLS. Never use a service-role key in client code.
- All AI calls route through lib/ai/gemini.ts and model names live only in lib/ai/config.ts.
- All money math is consolidated in lib/calc.ts — never compute totals client-side from untrusted AI outputs.
- The gigs/ folder contains standalone example gigs and is excluded from the main app build.

Next steps (recommended)
1. Public landing page (/) with marketing copy and quick setup steps.
2. Security page: allow the user to turn 2FA on/off from the app (and list active sessions).
3. Edit saved order flow (allow sellers to correct item names/qtys after save and propagate to khata/dispatch where appropriate).
4. Improve OCR and speech accuracy by exploring specialized speech-to-text providers or a lightweight on-device preprocessor.
5. Add E2E tests for the core sign-up -> parse -> confirm -> save journey.

Where to look in the repo
- app/ — Next.js pages and route handlers
- app/api/parse/route.ts and app/api/draft/route.ts — server AI route handlers
- lib/ai/ — model adapter (gemini.ts), parse logic (parse.ts), draft generator (draft.ts)
- lib/schema.ts — zod schemas for AI output
- lib/calc.ts — totals and balances
- lib/supabase/ — browser and server supabase helpers
- supabase/migrations/ — SQL migrations
- gigs/ — standalone example gigs (excluded from build)

This handover is intentionally focused: code changes should follow the conventions and rules described here. If you cannot verify a provider key or live model, mark that clearly in any future change.
