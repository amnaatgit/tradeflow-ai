import type { DraftInputType } from "./ai/draft";

const rs = (n: number | null | undefined) => `Rs ${(n ?? 0).toLocaleString("en-US")}`;

// Standard messages used when the AI is unavailable, so the seller is never stuck.
export function draftFallback(i: Pick<DraftInputType, "kind" | "language" | "customer_name" | "items" | "total" | "advance" | "due" | "address">): string {
  const name = i.customer_name ? ` ${i.customer_name}` : "";
  const items = (i.items ?? []).map((it) => `- ${it.qty} x ${it.name}`).join("\n");
  const en = i.language === "english";
  switch (i.kind) {
    case "confirmation":
      return en
        ? `Hi${name}! Your order is confirmed:\n${items}\nTotal: ${rs(i.total)}${i.advance ? `\nAdvance received: ${rs(i.advance)}` : ""}\nDue on delivery: ${rs(i.due)}${i.address ? `\nDelivery: ${i.address}` : ""}\nThank you!`
        : `Assalam o Alaikum${name}! Aap ka order confirm ho gaya hai:\n${items}\nTotal: ${rs(i.total)}${i.advance ? `\nAdvance mil gaya: ${rs(i.advance)}` : ""}\nDelivery par: ${rs(i.due)}${i.address ? `\nAddress: ${i.address}` : ""}\nShukriya!`;
    case "reminder":
      return en
        ? `Hi${name}, a gentle reminder that ${rs(i.due)} is still due. Please send it when you can. Thank you!`
        : `Assalam o Alaikum${name}! Aap ka ${rs(i.due)} ka balance baqi hai. Meherbani kar ke jald ada kar dein. Shukriya!`;
    case "out_for_delivery":
      return en
        ? `Hi${name}! Your order is on its way.${i.due ? ` Please keep ${rs(i.due)} ready.` : ""} Thank you!`
        : `Assalam o Alaikum${name}! Aap ka order rawana ho gaya hai.${i.due ? ` Meherbani kar ke ${rs(i.due)} tayyar rakhein.` : ""} Shukriya!`;
    case "thank_you":
    default:
      return en
        ? `Hi${name}! Thank you for your order. We hope you love it, and we'd be happy to help again!`
        : `Assalam o Alaikum${name}! Order lene ka bohat shukriya. Umeed hai aap ko pasand aaya. Dobara zaroor order karein!`;
  }
}
