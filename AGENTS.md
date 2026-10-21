# AGENTS.md - TradeFlow AI

Instructions for AI coding agents working in this repository. Read fully before every task. SPEC.md has the product vision; this file wins if they disagree on scope.

## 1. Mission
TradeFlow AI is a mobile-first tool for Pakistani social-commerce sellers. The seller pastes a messy WhatsApp/Instagram order chat (English, Roman Urdu or mixed). AI extracts a structured order, the seller verifies it, and the app produces a saved order, a customer Khata (credit ledger), an area-grouped dispatch list, a printable receipt and a Roman Urdu payment reminder.

Core journey (must always work, test it after every change to auth, AI or saving):
sign up -> set up 2FA -> sign in with 2FA code -> paste chat at /orders/new -> AI extracts -> seller reviews and confirms -> order saved -> appears in /orders, /dispatch, /khata -> sign out and back in -> data is still there.

## 2. Stack (fixed, do not change or add alternatives)
- Next.js App Router + TypeScript (strict) + Tailwind CSS + shadcn/ui
- Supabase: Postgres, Auth (email + password, optional TOTP 2FA that is enforced once enabled)
- zod for all validation (client and server)
- LLM: one hosted model, called server-side only from /api/parse. The model is not fixed in advance: use whichever provider key is present in Secrets (OPENAI_API_KEY, GEMINI_API_KEY or ANTHROPIC_API_KEY) and read the model name from the AI_MODEL env var. Keep all provider-specific code in lib/ai/ so switching models changes one file. Never hardcode a model name anywhere else.
- Hosting: the builder's built-in preview/deploy. Use Vercel only if explicitly asked.

## 3. Hard rules (never break)
1. RLS on every table. Each table has user_id uuid not null default auth.uid() and a policy user_id = auth.uid() for all operations. Views use security_invoker = true. Two accounts must never see each other's data.
2. Never mock AI. Every AI feature makes a live model call. No hardcoded output presented as AI output.
3. No AI order is saved before the seller confirms it on the review screen.
4. Never trust AI for money. Totals, advances and balances are computed in lib/calc.ts from line items, not taken from model output.
5. Never trust a client-sent user_id. Rely on auth.uid() and RLS.
6. No secrets in code, commits, chat or the client bundle. Keys only in environment variables / the builder's Secrets. Never prefix server keys with NEXT_PUBLIC_.
7. Do not fabricate credentials, URLs, commits, tests or published gigs. If something is unfinished or unverified, say so in one line.
8. Ask before any change that could delete or reset existing data.

## 4. Data model
All tables: id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), created_at timestamptz default now(). Index user_id on every table.
- customers: name text not null, phone text, area text. Unique (user_id, phone) when phone is not null.
- orders: customer_id uuid references customers, raw_text text, address text, area text, advance numeric default 0, status text default 'pending' (pending | delivered | cancelled), ai_extraction jsonb (raw model output plus confidence).
- order_items: order_id uuid references orders on delete cascade, name text not null, qty int not null check (qty > 0), unit_price numeric not null check (unit_price >= 0).
- payments: customer_id uuid references customers, order_id uuid null, amount numeric not null check (amount > 0).
Order total = sum(qty * unit_price). Customer balance = sum(order totals) - sum(order advances) - sum(payments), excluding cancelled orders.
Put all SQL in supabase/schema.sql.

## 5. AI pipeline (/api/parse, logic in lib/ai/parse.ts, schema in lib/schema.ts)
- Input: raw chat text. Reject empty, over-long (more than 4000 chars) or clearly irrelevant input with a friendly message.
- Output JSON: customer_name, phone, address, area, items[{name, qty, unit_price}], advance, confidence{customer_name, phone, address, items, advance} (each 0 to 1).
- System prompt rules: handle Roman Urdu and mixed language; convert number words and units to numbers; return null for anything not stated; never invent names, phones, addresses or prices; use low confidence when ambiguous; include 2 few-shot examples (one Roman Urdu, one English).
- Validate with zod. Retry invalid JSON up to 2 times, then show a friendly error with a manual-entry form as fallback.
- Per-user rate limit on the endpoint.
- Review screen: fields that are null or below 0.7 confidence are highlighted yellow and editable. Save writes customer (reuse an existing one with the same phone), order, items and ai_extraction.

## 6. Features and pages
Build only what is listed. Every page needs loading, empty and error states.
1. Auth: sign up, sign in, sign out, optional TOTP 2FA (QR code + verify offered after sign up with a "Skip for now" option; once an account turns it on, the code is required on every sign in; component components/MfaSetup.tsx). Pages are protected client-side by components/auth-guard.tsx (wraps app/(app)/layout.tsx and the setup/verify pages); do not add auth middleware. Auth transport: the builder preview proxy strips cookies and Authorization headers before they reach the server, so the server never reads the session from cookies. Database reads and writes go from the browser straight to Supabase with RLS. Server routes that need the user (for example /api/parse) are called with apiFetch() from lib/api.ts, which puts the access token in the JSON body, and they validate it with getAccessToken() + requireUser() from lib/supabase/server.ts.
2. Layout: mobile-first sidebar or bottom nav: Dashboard, New Order, Orders, Dispatch, Khata, Sign out.
3. /orders/new: paste chat -> parse -> review card -> confirm -> save.
4. /orders: list of the user's orders (customer, area, total, status, date) and a details page with delivered/cancelled actions.
5. /dispatch: today's pending orders grouped by area with per-group totals, print-friendly via print CSS only, "Mark delivered" action.
6. /khata: customers with balances, customer detail with payment history and a form to record a payment, "Copy reminder" button copying a polite Roman Urdu WhatsApp message with name and balance (plain template, no AI call).
7. /orders/[id]/receipt: clean printable receipt (items, qty, price, advance, balance due) with a "Copy WhatsApp text" button. Use print CSS, no PDF library.
8. Dashboard: orders today, total pending balance, top area.

## 7. Scope and priority
Priority order: 1) auth + 2FA + schema, 2) AI parse, 3) review + save + orders, 4) Khata + receipt, 5) dispatch + dashboard + polish. Finish and verify each before starting the next.
Optional only if everything above is verified and budget remains: voice notes (speech-to-text via the configured provider), products and stock.
Out of scope: payment gateways, courier APIs, realtime subscriptions, PDF libraries, online classes, student features, UI languages beyond English plus Roman Urdu content.

## 8. Agent behaviour (saves tokens)
- Reply with minimal commentary. Never ask questions: make a sensible choice and state it in one line.
- Do only what the prompt asks. No unrequested features, no refactors, no tests, no new dependencies unless needed.
- Fix bugs by changing only the broken part. Never regenerate whole files or the whole app.
- Reuse existing code and keep files small. Shared logic in lib/ or components/. Gig modules stay self-contained.
- No placeholder text, lorem ipsum or TODO screens.
- Commit after each completed step with a clear message.

## 9. Folder structure
```
/app            routes (auth, dashboard, orders, dispatch, khata)
/app/api        server routes (parse)
/components     UI components (MfaSetup, OrderReviewCard, ...)
/lib            supabase clients, calc.ts, schema.ts, ai/parse.ts
/supabase       schema.sql (tables, indexes, RLS)
/gigs           two standalone reusable modules, each with its own README
README.md  SPEC.md  AI_DISCLOSURE.md  AGENTS.md  .env.example

Agents skills folder:
- .agents/skills/order-parsing/SKILL.md
- .agents/skills/supabase-rls/SKILL.md
```
Commands: npm install, npm run dev, npm run build (must pass before deploy), npm run lint.
Env vars (.env.example, no real values): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, AI_MODEL, and one server-only AI key (OPENAI_API_KEY, GEMINI_API_KEY or ANTHROPIC_API_KEY).

## 10. Code gigs (hackathon requirement, publish at least two)
Extract from code written during the event, with title, short description, setup steps and credited contributors:
1. /gigs/order-parsing: the Roman Urdu extraction prompt, zod schema, retry and confidence logic.
2. /gigs/supabase-auth-2fa: the TOTP 2FA setup and challenge components plus RLS policy examples.

## 11. Definition of done
- Sign up, 2FA, sign in and sign out work on the deployed app.
- Two test accounts see only their own data.
- The AI parse works on the deployed app with a live model call, tested within the last hour before submitting.
- Saved data survives a restart.
- npm run build passes. No broken layouts, placeholder text or unhandled error screens.
- README.md (what it does, stack, live URL, setup), SPEC.md, AI_DISCLOSURE.md are current.

## 12. Hackathon rules to respect
- No product code before 9:00 AM on 19 October. Commit throughout the event. No commits after code freeze (22 October, 11:00 PM PKT).
- Keep the AI key and credits working until winners are announced.
- Declare anything pre-existing in PRIOR_WORK.md.

## 13. AI disclosure (the agent maintains this, nothing is pre-filled)
The exact models and tools are not decided in advance, so never copy names from this file. You (the agent) create and keep AI_DISCLOSURE.md accurate on your own:
1. Create AI_DISCLOSURE.md in the first phase and update it in every phase that adds or changes an AI feature, dependency or reused component.
2. Product AI: read the real code and env (lib/ai/, AI_MODEL, which key is set) and list the provider, the exact model name and each feature that makes a live model call (for example order parsing in /api/parse). State only what the code actually does. Never claim a model or feature that is not in the code.
3. Development AI: list yourself, the coding agent and model running in this builder, as a tool used to write the code. Add a clearly marked line for the human team to complete: "Other AI tools used by the team: [team to fill in]". Do not guess about tools you cannot see.
4. Reused code: list every open-source library and reused component with its licence and a link, taken from package.json and any copied snippets.
5. Add a short statement that product code was written during the event with the AI assistance listed. If anything pre-existing is reused, say so and point to PRIOR_WORK.md.
6. If the model or provider changes later, update AI_DISCLOSURE.md and the README in the same change.
7. If a fact is unknown, write "unknown, team to confirm" instead of guessing. Misstating how AI was used can disqualify the team.
