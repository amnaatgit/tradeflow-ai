# Supabase Auth + 2FA Kit for Next.js (App Router)

Add **sign-up, sign-in and authenticator-app 2FA (TOTP)** to a Next.js app in about 10 minutes, with the parts people usually get wrong already handled: 2FA enforced on the server, half-finished enrolments cleaned up, a Security page to turn 2FA on or off, and an RLS template so every user only sees their own rows.

Extracted and cleaned up from **TradeFlow AI**, a hackathon app that uses this exact flow. The kit builds cleanly with Next.js 15 (`next build`, strict TypeScript, ESLint).

## What you get

| Piece | File | What it does |
|---|---|---|
| Sign up | `app/auth/sign-up/page.tsx` | Email + password + confirm. Detects "already registered" (both Supabase modes) and handles email confirmation on/off. |
| Sign in | `app/auth/sign-in/page.tsx` | Sends 2FA users to the code screen, everyone else to the optional 2FA setup. Friendly errors. |
| 2FA setup | `components/mfa-setup.tsx` | QR code + manual key, verifies the first code, removes stale unverified factors. Optional or mandatory. |
| 2FA verify | `components/mfa-verify.tsx` | The 6-digit step at sign-in; upgrades the session to `aal2`. |
| Security page | `components/security-settings.tsx` | Shows 2FA status; turn on, or turn off with a confirm step. |
| Page guard | `components/auth-guard.tsx` | Redirects signed-out users, forces the code for 2FA accounts, and shows Retry instead of an endless "Loading…". |
| API guard | `lib/supabase/server.ts` | `requireUser(token)` validates the token **and** rejects `aal1` tokens for accounts with 2FA on (403). Returns a Supabase client that runs as the user, so RLS applies. |
| Fetch helper | `lib/auth-fetch.ts` | Calls your API routes as the signed-in user. |
| RLS template | `supabase/rls-template.sql` | Per-user table with the four policies, an index, and an optional "aal2 required" policy. |

Everything else is plain Tailwind (`components/ui.tsx`), with no UI library needed.

## Setup (10 minutes)

1. `npm i @supabase/ssr @supabase/supabase-js`
2. Copy `lib/`, `components/` and `app/` into your project. Change paths and the app name in `lib/auth-config.ts`.
3. Add `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
4. In Supabase: **Authentication → Multi-Factor → enable TOTP** (it is on by default in new projects).
5. Optional: run `supabase/rls-template.sql` for your first per-user table.

## Protect pages and API routes

```tsx
// app/(app)/layout.tsx: every page inside needs a session (+ the 2FA code if enabled)
<AuthGuard need="aal2">{children}</AuthGuard>
```

```ts
// app/api/anything/route.ts
const body = await req.json().catch(() => ({}));
const auth = await requireUser(getAccessToken(req, body));
if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
const { data } = await auth.supabase.from("notes").select("*"); // RLS: only this user's rows
```

```ts
// client side
const res = await authFetch("/api/anything", { some: "data" });
```

## The flow

1. **Sign up** → "Account created, sign in" (or "check your email" if confirmation is on)
2. **Sign in** → 2FA on? **Enter code** : **Turn on 2FA (optional, can skip)**
3. **App pages** behind `AuthGuard`. **Security page** to turn 2FA on/off.
4. **API routes** reject missing or invalid tokens (401) and missing 2FA (403).

## Why it's safer than the usual examples

- A client-side guard alone is not security, so the kit checks the token **and** the 2FA level on the server for every API call.
- Abandoned QR enrolments make the next `enroll()` fail; the kit removes them first.
- Data isolation is done with **Row Level Security**, not with `where user_id = ...` in your code.

## Contributors

Amna Shahzad, Mania Ashar and Bisma Shahid. MIT licensed.
