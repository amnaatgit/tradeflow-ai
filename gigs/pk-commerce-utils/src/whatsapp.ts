import { normalizePhone } from "./phone.js";

/**
 * Number in the format wa.me expects (country code, no "+"): "923001234567".
 * Pakistani local numbers get 92; numbers that already have a country code are kept.
 */
export function toWhatsAppNumber(raw: string | null | undefined): string | null {
  const n = normalizePhone(raw);
  if (!n) return null;
  if (/^03\d{9}$/.test(n)) return "92" + n.slice(1);
  if (/^\d{11,15}$/.test(n) && !n.startsWith("0")) return n;
  return null;
}

/** Click-to-chat link that opens WhatsApp with the message typed in (the seller still presses send). */
export function whatsAppLink(phone: string | null | undefined, text = ""): string | null {
  const n = toWhatsAppNumber(phone);
  if (!n) return null;
  return text ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : `https://wa.me/${n}`;
}
