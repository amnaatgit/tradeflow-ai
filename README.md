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
- https://tradeflow-ai-phi.vercel.app (sign up with any email; 2FA is optional)

How to use the live app (no setup needed)
1. Open https://tradeflow-ai-phi.vercel.app and click **Create free account**. Use any email and a password of 8+ characters (no email confirmation needed).
2. Sign in. You will be offered **2FA**: click **Show QR code**, scan it with Google Authenticator, Authy or 1Password, and enter the 6-digit code (or click **Skip for now**). You can turn 2FA on or off later on the **Security** page (shield icon on mobile).
3. **New order:** press a sample button (**Roman Urdu**, **English** or **Mixed**) or paste your own WhatsApp order chat, then click **Read with AI**. You can also click **Upload screenshot** (a WhatsApp chat screenshot) or **Upload voice note**. The AI fills in the customer, phone, address, items, prices and advance; yellow fields are missing or uncertain. Fix anything, then click **Confirm & save**.
4. **Orders:** open an order to see its details, record a payment, mark it delivered, or open the **Receipt** and click **Write with AI** for a ready WhatsApp confirmation (Roman Urdu or English).
5. **Khata:** see what each customer owes, record payments (Cash, JazzCash, Easypaisa, bank) and write an AI payment reminder.
6. **Dispatch:** pending orders grouped by area with the cash to collect; mark them delivered.
7. **Dashboard:** today's orders and sales, money to collect, and **Get AI tips** for 3 suggestions based on your own numbers.
8. **Sign out and sign back in** (with your 2FA code if enabled): everything you saved is still there. A second account sees none of your data.

Setup (run it locally in about 10 minutes)

You need Node.js 18+, a free Supabase project and a free Google AI Studio (Gemini) API key.

1. Clone the repo and install: `git clone https://github.com/amnaatgit/tradeflow-ai && cd tradeflow-ai && npm install`
2. Create a Supabase project. In its SQL editor, run the files in `supabase/migrations/` in name order (they create the tables and the row-level security policies).
3. In Supabase: Authentication -> Multi-Factor -> make sure TOTP is enabled. For quick testing you can turn off "Confirm email" under Authentication -> Sign In / Providers -> Email.
4. Copy `.env.example` to `.env.local` and fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_URL, SUPABASE_ANON_KEY (Supabase -> Project Settings -> API) and GEMINI_API_KEY (https://aistudio.google.com/apikey). Never commit real keys.
5. `npm run dev`, open http://localhost:3000, click Create free account, sign in, and optionally turn on 2FA.
6. Try the AI: New order -> press a sample (Roman Urdu / English / Mixed) -> Read with AI -> check the fields -> Confirm & save.

No setup needed to just try it: use the live app at https://tradeflow-ai-phi.vercel.app

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

Code gigs (published on Devmarketplace, code in /gigs)
- Roman Urdu Order Parser: text, screenshot or voice note to order JSON (gigs/order-parser-gemini) — https://beta.devmarketplace.com/gig/db26e455-e122-4342-88ed-1987e2c968d7
- Supabase Auth + 2FA Kit for Next.js (gigs/supabase-auth-2fa-kit) — https://beta.devmarketplace.com/gig/51e50d6c-728e-49a5-b0b1-aa03bade75d3
- AI WhatsApp Message Drafts in Roman Urdu, Urdu or English (gigs/ai-whatsapp-drafts) — https://beta.devmarketplace.com/gig/4aa788ac-0be1-4986-9840-4af85dddfb0e
- PK Seller Toolkit: phones, WhatsApp links, PKR, khata math (gigs/pk-commerce-utils) — https://beta.devmarketplace.com/gig/f6bed826-8e6b-43fd-a509-44df05a1bda7
- gigs/order-parsing and gigs/supabase-auth-2fa are the earlier first versions, kept for history.

Links
- AGENTS.md — instructions for coding agents and hard rules
- SPEC.md — product specification and architecture
- AI_DISCLOSURE.md — which AI is used and how

Notes
- The codebase centralizes model names in lib/ai/config.ts. The server makes live model calls; no AI output is hardcoded.
- All data access from the browser uses createClient() from lib/supabase/client.ts and relies on RLS. Server routes that need to verify the user (for example /api/parse) accept an access token in the request body and validate it server-side.
