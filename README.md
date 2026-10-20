# TradeFlow AI

TradeFlow AI is a mobile-first tool for Pakistani social-commerce sellers that extracts structured orders from pasted WhatsApp/Instagram chat using AI.

## Setup

1. Add required environment variables (see `.env.example`) in the Secrets panel.
2. Run `npm install` to install dependencies.
3. Run `npm run dev` to start the development server.

## Testing

- Sign-up and sign-in flows with optional TOTP 2FA are implemented (offered after sign up; once enabled, a code is required on every sign in).
- To test sign-up, provide your email and password; no username needed.

## Build and TypeScript Validation

Run `npm run build` and `npm run lint` before deploying.



Phase 1 implemented: core AI parsing flow.

Run:
- npm install
- npm run dev

Secrets (.env or preview secrets):
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_URL
- SUPABASE_ANON_KEY
- GEMINI_API_KEY
- (optional) AI_MODEL to override default

Notes:
- Model names are centralized in lib/ai/config.ts
- /api/parse authenticates via access token in body or Authorization header using getAccessToken + requireUser
- In-memory per-user rate limit 10 req/min
- Gemini calls use x-goog-api-key header and request generationConfig.responseMimeType = "application/json"
