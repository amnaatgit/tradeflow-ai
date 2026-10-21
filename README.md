# TradeFlow AI

TradeFlow AI is a mobile-first tool for Pakistani social-commerce sellers that extracts structured orders from pasted WhatsApp/Instagram chat using AI and helps manage orders, dispatch, receipts and a simple credit ledger (khata).

What it does
- Convert messy English, Roman Urdu or mixed chat into structured orders using a server-side AI parser.
- Provide a review screen where the seller edits and confirms the AI extraction before anything is saved.
- Save customers, orders, order items and payments in Supabase (Postgres) with row-level security so each user only sees their data.
- Dispatch view grouped by area, printable receipts, khata (customer ledger) with WhatsApp reminder/copy links, and a dashboard with basic metrics.

Main features
- AI order intake from English / Roman Urdu chat with an editable review screen.
- Orders list, order detail, printable receipt and dispatch manifests grouped by area.
- Khata: customer balances, payments and WhatsApp reminder copy links.
- Optional TOTP 2FA for accounts.
- Mobile-first responsive UI built with Next.js + Tailwind and small UI primitives.

Tech stack
- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres) for storage and Auth (RLS enforces per-user access)
- Google Gemini (Generative Language API) used by the server /api/parse route (configured in lib/ai/)
- zod for runtime validation of AI output

Live URL
- (add after deploy)

Setup
1. Copy the environment variable names from `.env.example` into your environment or the Secrets panel. Do NOT store secret keys in source control.
2. npm install
3. npm run dev
4. Create an account and follow the optional TOTP setup flow if you want 2FA.

Environment variables (see `.env.example`)
- NEXT_PUBLIC_SUPABASE_URL — Supabase project URL (browser-safe)
- NEXT_PUBLIC_SUPABASE_ANON_KEY — Supabase anon key (browser-safe)
- SUPABASE_URL — Supabase project URL (server reference)
- SUPABASE_ANON_KEY — Supabase anon key (server reference)
- GEMINI_API_KEY — Google AI Studio key for Generative Language API (server-only)
- AI_MODEL — optional override for the model name used by the server

How the AI step works
- The client sends the raw chat text and optional media to POST /api/parse (access token placed in the request body by the client helper). The server authenticates the token with getAccessToken(req, body) + requireUser() and then calls the Generative Language API (configured in lib/ai/).
- The model is asked to return structured JSON and the server requests JSON output (responseMimeType = "application/json"). When media is provided (screenshots or voice notes) the request includes the file inline as base64 data, and the AI returns a transcript field describing what it read or heard.
- The model chain includes fallback models configured in lib/ai/config.ts; the server retries an alternate model once when the chosen model is not found and handles transient errors with a retry policy.
- The raw model output (including per-field confidence scores) is validated with zod and the server will retry parsing invalid JSON a small number of times before returning a friendly error.
- The review screen highlights fields that are null or whose confidence is below 0.7 in yellow. Nothing is saved until the seller presses Confirm & save.
- Money math (totals, balance calculations) is always computed in code via lib/calc.ts — never trusted from the model.

How AI-written WhatsApp drafts work
- The app provides /api/draft which generates short editable WhatsApp message drafts (confirmation or reminder). The server calls the same model chain and returns a validated { message } JSON. Sellers edit and send messages manually; the API does not send messages.

Code gigs
- gigs/order-parsing — self-contained order parser gig (AI prompt, zod schema, Gemini call and retries).

Code gigs
- gigs/order-parsing — self-contained order parser gig (AI prompt, zod schema, Gemini call and retries).

Links
- AGENTS.md — instructions for coding agents and hard rules
- SPEC.md — product specification and architecture
- AI_DISCLOSURE.md — which AI is used and how

Notes
- The codebase centralizes model names in lib/ai/config.ts. The server makes live model calls; no AI output is hardcoded.
- All data access from the browser uses createClient() from lib/supabase/client.ts and relies on RLS. Server routes that need to verify the user (for example /api/parse) accept an access token in the request body and validate it server-side.
