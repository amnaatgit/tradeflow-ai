# AI Disclosure

## Product AI

Provider: Google Gemini (Generative Language API) called via the server route /api/parse. The model names are defined in lib/ai/config.ts (DEFAULT_MODEL and FALLBACK_MODEL). The /api/draft route writes short WhatsApp message drafts from the order numbers only; the seller edits and sends them manually. The server requests JSON output (generationConfig.responseMimeType = "application/json") and includes the API key in the x-goog-api-key header. The AI only performs structured field extraction (with per-field confidence scores); extracted data is shown to the seller for review and nothing is saved until the seller confirms. Screenshots and voice notes are sent to Gemini as inline data in the request; the media itself is not stored on the server — only the extracted order and transcript are saved after the seller confirms. The /api/insights route sends the seller's own aggregated numbers (top items, areas, biggest dues) to Gemini and shows 3 short tips on the dashboard. Models are set in lib/ai/config.ts: gemini-3.1-flash-lite first, then gemini-3.5-flash-lite, gemini-flash-latest and gemini-3.6-flash as fallbacks when a model is busy; each call has a 15 s (text) or 30 s (image/audio) time limit. Every AI response is validated with zod before it is used.

## Development AI

Code in this repository was produced with assistance from the Devmarketplace AI builder agent (models used: GPT-4.1 mini, GPT-5 mini, GPT-5.6 Luna and GPT-5.1) guided by AGENTS.md and SPEC.md. The coding agent helped assemble and edit files; human reviewers tested and adjusted the code.

## Other AI tools used by the team


generation was done by the agent on the website itself 

## Open-source components

All are used as npm packages under their own licences (versions in package.json). No other code was copied from outside the team.

| Component | Licence | Link |
|---|---|---|
| Next.js | MIT | https://github.com/vercel/next.js |
| React, React DOM | MIT | https://github.com/facebook/react |
| @supabase/supabase-js, @supabase/ssr | MIT | https://github.com/supabase/supabase-js |
| Tailwind CSS | MIT | https://github.com/tailwindlabs/tailwindcss |
| tailwind-merge | MIT | https://github.com/dcastil/tailwind-merge |
| clsx | MIT | https://github.com/lukeed/clsx |
| lucide-react (icons) | ISC | https://github.com/lucide-icons/lucide |
| zod | MIT | https://github.com/colinhacks/zod |
| PostCSS, Autoprefixer | MIT | https://github.com/postcss/postcss |
| TypeScript | Apache-2.0 | https://github.com/microsoft/TypeScript |
| ESLint, eslint-config-next | MIT | https://github.com/eslint/eslint |

Hosted services: Supabase (Postgres database and Auth with TOTP 2FA), Google Gemini API, Vercel (hosting).

## Code origin

Code was generated with the Devmarketplace builder agent from AGENTS.md and SPEC.md, then reviewed, tested and edited by the team. 