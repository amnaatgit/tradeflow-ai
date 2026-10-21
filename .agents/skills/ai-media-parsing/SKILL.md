---
name: ai-media-parsing
description: How /api/parse accepts chat and optional media (image/audio) and how parse.ts builds prompts and retries.
---

Summary
- Purpose: explain how the AI order parser accepts screenshots and voice notes, the allowed media types and size limits, and how retries resend the media on each attempt.

How /api/parse accepts input
- Body: { chat?: string, media?: { mimeType: string, data: string } }
- media.data is base64 WITHOUT the "data:" prefix. The server will accept data: URLs and strips the prefix before validation.
- Either chat or media must be present. If both are missing the endpoint returns 400 "Empty chat".

Allowed mime types and limits
- Images: image/jpeg, image/png, image/webp. Client-resized images are sent as JPEG.
- Audio: audio/ogg, audio/mpeg, audio/mp4, audio/aac, audio/wav, audio/webm.
- Chat text limit: 4000 characters. Media.data max length: 4_000_000 characters (~3MB base64).

How parse.ts builds prompts
- When media is provided, parseOrder(chat, media) includes media in the user message parts as inlineData: { mimeType, data } followed by a text part with "Extra note from the seller: <chat>" when chat is also provided.
- System prompt instructs the model to read screenshots and listen to voice notes; it also asks the model to return transcript: the customer's words in Latin letters (Roman Urdu or English).
- If the chat mentions delivery charges (e.g. "delivery 250", "DC 200"), parse.ts converts that into an item named "Delivery charges" with qty 1 and unit_price set accordingly.

Retries
- parse.ts tries to parse the model's output as JSON. If the JSON is invalid or missing fields, it retries up to 2 times. Each retry resends the same media inline so the model can re-evaluate the attachment.
- On persistent 429/500/503 errors the server returns an AI-busy error to the client: "The AI is busy right now. Try again in a minute".

Edge cases and notes
- The AI must not invent names, phones, addresses or prices. If a field is not present in the input, the model should return null for that field and a low confidence.
- Transcript quality varies with audio clarity; the seller should edit the transcript when present.

This skill file is for agents who maintain or extend the AI parsing code.
