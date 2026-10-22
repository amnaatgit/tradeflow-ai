# Skills for coding agents

Project skills live in `.agents/skills/<name>/SKILL.md`. Read the matching skill before changing that part of the app. The hard rules are in AGENTS.md.

| Skill | Use it when you change | What it covers |
|---|---|---|
| [order-parsing](.agents/skills/order-parsing/SKILL.md) | `lib/ai/parse.ts`, `lib/schema.ts`, the New order review screen | The extraction prompt (English + Roman Urdu), zod validation, retries, confidence scores, never trusting AI money math |
| [ai-media-parsing](.agents/skills/ai-media-parsing/SKILL.md) | `app/api/parse/route.ts`, screenshot or voice note upload | How images and audio are resized, size-checked and sent inline to Gemini, and how the transcript is returned |
| [whatsapp-drafts](.agents/skills/whatsapp-drafts/SKILL.md) | `app/api/draft/route.ts`, `lib/ai/draft.ts`, `components/ai-message-box.tsx` | AI-written confirmations and payment reminders, languages and tone, the template fallback when the AI is busy |
| [ai-insights](.agents/skills/ai-insights/SKILL.md) | `lib/ai/insights.ts`, `app/api/insights/route.ts`, Dashboard AI tips card | Shop tips written from Supabase stats, validation and rate limits |
| [supabase-rls](.agents/skills/supabase-rls/SKILL.md) | `supabase/` migrations, any new table | Adding per-user tables with `user_id default auth.uid()` and the four RLS policies so each account only sees its own data |

## Shared rules (short version)

- All model calls go through `lib/ai/gemini.ts`; model names live only in `lib/ai/config.ts`.
- API routes check the user with `getAccessToken(req, body)` + `requireUser()`; accounts with 2FA on must send an aal2 token.
- Money is always calculated in code (`lib/calc.ts`), never taken from AI output.
- Phones are saved through `normalizePhone` (`lib/phone.ts`).
- Nothing the AI produces is saved or sent until the seller confirms it.
