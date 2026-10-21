TradeFlow AI — Summary

Overview
- TradeFlow AI is a Next.js + Supabase web app that helps chat-first sellers convert unstructured WhatsApp/Instagram chat into structured orders using a server-side AI parser. Sellers review AI extractions before confirming — no AI output is saved without user consent.

Pages & Flows
- /orders/new — Paste chat, call /api/parse, review editable extraction, Confirm & save.
- /orders — list of saved orders; /orders/[id] shows details and links to a printable receipt.
- /dispatch — pending orders grouped by area, print-friendly lists for riders.
- /khata — customer ledger with balances and payment history; copy WhatsApp reminders.
- Dashboard — overview of recent orders, total pending balance and top areas.
- Auth — email/password sign-up and sign-in with optional TOTP 2FA (offered after sign-up).

Data Flow & Auth
- Browser-first data access: all read/write operations in the app use the Supabase browser client (lib/supabase/client.ts) and rely on Row-Level Security (RLS). This ensures each user only sees their own rows.
- Server route /api/parse is called with the access token in the request body (apiFetch in lib/api.ts adds it). The server validates the token with getAccessToken(req, body) and requireUser() from lib/supabase/server.ts. This avoids cookie/middleware-based auth for the parse endpoint.

AI Pipeline
- The server-side /api/parse route sends the raw chat to the configured model via lib/ai/gemini.ts. Model names are centralized in lib/ai/config.ts (DEFAULT_MODEL and FALLBACK_MODEL). The server requests JSON output and validates it with zod (lib/schema.ts). The server retries parsing invalid JSON a small number of times.

Known limitations
- Voice notes and PNG/PDF receipts are planned but not implemented.
- Some build-time type issues around Next.js params are addressed in client pages by using useParams from next/navigation where needed.

Where to look in the repo
- app/ — Next.js routes and UI pages
- app/api/parse — AI order intake route
- lib/ai — AI client adapters and parsing logic
- lib/schema.ts — zod schema for AI output
- lib/calc.ts — money math helpers (totals, balances)
- supabase/migrations — DB schema and RLS migrations
- AGENTS.md / SPEC.md / AI_DISCLOSURE.md — project spec and agent instructions

