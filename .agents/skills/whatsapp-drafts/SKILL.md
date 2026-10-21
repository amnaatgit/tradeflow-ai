---
name: whatsapp-drafts
description: How /api/draft and components/ai-message-box.tsx generate WhatsApp message drafts using the AI and the fallback behaviour.
---

Summary
- Purpose: document the API, the draft generation constraints and how the client UI uses the draft API.

API contract (/api/draft)
- Body: validated JSON describing the draft request. Common fields: kind ("confirmation" | "reminder"), language ("roman_urdu" | "english"), tone ("friendly" | "firm"), customer_name, items (confirmation only), total, advance, paid, due, address.
- Auth: same token-in-body approach as /api/parse. Rate limit: 20 requests/minute per user.
- Outcome: returns { message: string } where message is a short WhatsApp-friendly text (1–700 chars). On AI failure returns 502 { error: "The AI is busy right now. Try again in a minute" }.

Client behaviour (components/ai-message-box.tsx)
- The UI shows language and tone selects and a "Write with AI" button. When pressed it POSTs to /api/draft and displays the resulting message in an editable textarea.
- Fallback: if the AI call fails the component falls back to a standard template message (existing reminderText/confirmationText) and shows a notice "AI unavailable, using the standard message." The seller can edit and copy or open WhatsApp manually.
- The component provides "Copy" (uses lib/clipboard.copyText) and "Open WhatsApp" which opens wa.me/<number>?text=<encoded> using toWhatsAppNumber.

Model and constraints
- System prompt produces at most 6 short lines and never invents bank details, links or dates. Money amounts are formatted like "Rs 3,200".
- Drafts are for human editing and manual sending; /api/draft never sends messages automatically.

This skill file is for agents extending WhatsApp draft generation or the UI.
