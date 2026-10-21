Support notes for TradeFlow AI local preview

- Add GEMINI_API_KEY and Supabase keys in Secrets before running.
- If model returns no text, the server replies with 500 and message 'Gemini returned no text'. Retry later or check the API key.
- Media uploads are sent inline (base64) to /api/parse. Keep attachments under the size limits.
