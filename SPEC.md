# Product Specification: TradeFlow AI

**The Conversational Operating System for Social-Commerce Merchants**

---

## 1. Executive Summary & Problem Overview

### The Problem
Across emerging markets, over 70% of digital micro-transactions occur outside formal e-commerce storefronts, taking place inside messaging platforms like WhatsApp, Instagram DMs, and voice calls. Millions of independent sellers process thousands of dollars in monthly sales using manual paper notebooks or raw phone notes.

This informal workflow creates critical business vulnerabilities:
- **Severe Human Error:** Orders are split across chaotic chat threads, leading to frequent errors in item variants, quantities, and delivery addresses.
- **Revenue Leakage:** Sellers routinely extend short-term credit (*udhaar*) or Cash-on-Delivery (COD) terms to buyers. Due to manual tracking, **10%–15% of annual revenue is lost** to uncollected balances.
- **Inefficient Logistics:** Preparing daily delivery lists for riders or courier services takes hours of manual address sorting and area grouping.
- **Unprofessional Communication:** Hand-written receipts lower buyer trust and increase order cancellations before fulfillment.

### The Solution
**TradeFlow AI** bridges this operational gap. It acts as an automated digital assistant (*Munshi*) that ingests unstructured chat threads (in English, Roman Urdu, or regional dialects) and 5-second voice notes, converting them into structured order records, area-grouped dispatch manifests, digital ledger entries, and shareable WhatsApp invoices within seconds.

---

## 2. Core Target Audience & Market Relevance

- **Target Users:** Social-commerce merchants, Instagram fashion/boutique sellers, home chefs, local retail distributors, and micro-vendors running chat-first businesses.
- **Geographic Focus:** Mobile-first and chat-dominated commerce markets (starting with Pakistan and South Asia).
- **Primary Value Proposition:** Reduces daily order-entry administrative work by **80%**, eliminates delivery address errors, and recovers lost revenue through automated credit tracking.

---

## 3. Product Features & Architecture

### Key Functional Modules

1. **Multi-Modal Order Ingestion:**
   - **Chat Parsing:** Merchants copy and paste raw chat snippets directly into the application.
   - **Voice Command Processing:** Merchants record a voice note describing an order or debt clearance (planned).
   - **Entity Extraction:** Extracts Customer Name, Phone Number, Delivery Address, Line Items, Quantities, Unit Prices, Advance Payments, and Unpaid Balances.

2. **AI Confidence Guardrail & Verification Screen:**
   - Displays extracted data on a pre-confirmation card before saving.
   - Highlights missing or low-confidence fields (e.g., incomplete street address) in yellow for 1-click merchant correction, eliminating AI hallucination risks in real business operations.

3. **Automated Dispatch & Logistics Optimizer:**
   - Categorizes completed orders by geographic zone or neighborhood (e.g., DHA, Gulshan, Johar), producing a print/share-ready dispatch list for delivery riders.

4. **Digital Khata & Automated Payment Reminders:**
   - Maintains a live ledger of pending COD payments and customer balances.
   - Generates polite, localized payment reminder messages (in Roman Urdu or English) ready to send via WhatsApp with a single tap.

5. **Instant Receipt & Invoice Generator:**
   - Converts confirmed orders into clean, branded digital receipts (PNG/PDF) to share back with buyers for instant confirmation (print CSS receipts planned).

---

## 4. Technical Architecture & Tech Stack

- Frontend: Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui for small UI primitives.
- Backend/Database: Supabase (Postgres) with Row-Level Security (RLS) and Auth (email + optional TOTP 2FA).
- AI: Google Gemini 3.1 Flash-Lite via the Generative Language REST API (server-side only at /api/parse), with a fallback to gemini-flash-latest if the primary model name is unavailable.
- Receipts: print CSS for printable receipts (PNG/PDF export is planned).

---

## 5. User Workflow & System Execution

```text
[ Unstructured Input ]
  ├─ Raw WhatsApp/Insta Chat Snippets
  └─ 5-second Voice Notes (Roman Urdu/English) (planned)
         │
         ▼
[ TradeFlow AI Parsing Engine (/api/parse) ]
  ├─ Server authenticates the request token using getAccessToken(req, body) + requireUser()
  ├─ Calls Google Gemini via the Generative Language API
  ├─ Validates the model output with zod and retries parsing invalid JSON up to 2 times
  └─ Returns extraction plus per-field confidence scores
         │
         ▼
[ Pre-Confirmation Guardrail Screen ]
  └─ High-confidence auto-filled / Low-confidence highlighted in Yellow
         │
         ▼
[ Actionable Business Outputs ]
  ├─ 📄 Branded WhatsApp Receipt (printable via CSS)
  ├─ 🚚 Area-Grouped Rider Dispatch Sheet
  ├─ 📖 Updated Customer Khata Ledger
  └─ 💬 1-Click WhatsApp Payment Reminder Draft
```

---

## 6. Non-functional constraints & Security

- All user data is protected with Supabase RLS; every table includes user_id defaulting to auth.uid() and policies restricting access to auth.uid() only.
- No AI hallucinations are saved: the seller must confirm before anything persists.
- Money math (totals, balances) is always calculated in code (lib/calc.ts).
- The /api/parse route authenticates using access tokens passed in the request body (no cookies or middleware reliance).

---

## 7. Planned enhancements
- Voice-notes ingestion (speech-to-text) — planned
- PNG/PDF receipts export — planned

---

## 8. Remaining unknowns
- Exact production endpoints and keys for AI and speech services (team to fill in in deployment secrets).

---

## 9. References
- AGENTS.md (developer agent instructions)
- lib/ai/ (AI model adapter)
- lib/schema.ts (zod schema for AI output)

