# Order parsing gig

What it does

- Parses a single customer order chat (English, Roman Urdu or mixed) and returns a strict JSON extraction: customer_name, phone, address, area, items, advance and per-field confidence scores.

How it works

- Uses Google Gemini generateContent REST API with a system prompt and two few-shot examples.
- Expects the model to return a JSON object; validates with zod.
- Retries up to 2 times on invalid JSON.
- If the model returns 404/429/500/503 the code retries once with a fallback model.
- Fields with confidence < 0.7 should be flagged for review by the caller.

Setup

- Set GEMINI_API_KEY in the environment. Optionally set AI_MODEL to override the default model.

Usage

- Import parseOrder from lib/ai/parse and call parseOrder(chat, { apiKey, model?, fallback? }).

Contributors

- Amna Shahzad, Mania Ashar and Bisma Shahid
