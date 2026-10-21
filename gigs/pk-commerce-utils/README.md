# pk-commerce-utils: Pakistani seller toolkit (TypeScript, zero dependencies)

Small, tested helpers for anyone building apps for **Pakistani online sellers** (WhatsApp/Instagram shops, home businesses, COD stores). These are the bits everyone rewrites badly: phone matching, WhatsApp links, PKR formatting, Roman Urdu amounts and khata math.

**9 tests, 0 dependencies, works in Node, Next.js, React Native and the browser.**

## Why you need it

| Problem | Without this | With this |
|---|---|---|
| Same customer, different phone formats | "0300-1234567", "+92 300 1234567" and "3001234567" become 3 customers | `normalizePhone()` → `03001234567` for all of them |
| WhatsApp links | Broken `wa.me/0300...` links | `whatsAppLink(phone, text)` → `https://wa.me/923001234567?text=...` |
| Amounts in chats | "dhai hazar", "1.5k" and "sawa do sau" can't be read | `parseAmount()` → 2500, 1500, 225 |
| Money display | `125000` | `formatPKR(125000, { lakh: true })` → `Rs 1,25,000` |
| Khata / ledger | Cancelled orders counted, unlinked payments ignored, riders told to collect too much | `customerBalance()` and `amountsToCollect()` get it right |

## Install

Copy `src/` into your project (or publish it as a local package). No npm dependencies.

```ts
import { normalizePhone, whatsAppLink, formatPKR, parseAmount, customerBalance, amountsToCollect } from "./src";
```

## Phones and WhatsApp

```ts
normalizePhone("+92 300 1234567");   // "03001234567"  (use as your DB key)
isPkMobile("021-34567890");          // false (landline)
toE164("0321 4455667");              // "+923214455667"
formatPhone("923001234567");         // "0300-1234567"
whatsAppLink("0300-1234567", "Assalam o Alaikum! Aap ka order confirm ho gaya hai.");
// "https://wa.me/923001234567?text=Assalam%20o%20Alaikum!..."
```

## Amounts the way customers write them

```ts
parseAmount("2 hazar");        // 2000
parseAmount("dhai hazar");     // 2500
parseAmount("dedh sau");       // 150
parseAmount("sawa do sau");    // 225
parseAmount("paune 2 hazar");  // 1750
parseAmount("2 lakh 50 hazar");// 250000
parseAmount("1.5k");           // 1500
parseAmount("do darjan");      // 24
parseAmount("Rs. 1,25,000/-"); // 125000
formatPKR(3200);               // "Rs 3,200"
formatPKR(125000, { lakh: true }); // "Rs 1,25,000"
```

Use `parseAmount` on an amount snippet (a form field or a phrase), not on a whole chat.

## Khata (customer ledger)

```ts
const orders = [
  { id: "o1", created_at: "2026-10-01", status: "pending", advance: 1000, items: [{ qty: 2, unit_price: 2500 }, { qty: 1, unit_price: 2800 }] },
  { id: "o2", created_at: "2026-10-05", status: "pending", items: [{ qty: 1, unit_price: 3200 }], delivery_charge: 250, discount: 200 },
];
const payments = [{ amount: 1000 }]; // paid via JazzCash, not linked to an order

orderTotal(orders[1]);                 // 3250 (items + delivery - discount)
customerBalance(orders, payments);     // 9050 owed (cancelled orders are excluded)
amountsToCollect(orders, payments);    // { o1: 6800, o2: 2250 }, oldest first, never more than the real balance
```

## Run the tests

```bash
npm i -D typescript @types/node
npm test
```

Extracted from **TradeFlow AI** (an AI order manager for WhatsApp sellers), where these functions power the orders, dispatch and khata screens.

## Contributors

Amna Shahzad, Mania Ashar and Bisma Shahid. MIT licensed.
