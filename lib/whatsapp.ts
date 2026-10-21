import { normalizePhone } from "./phone";

export function toWhatsAppNumber(phone: string): string | null {
  if (!phone) return null;
  const n = normalizePhone(phone);
  if (!n) return null;
  // n should be digits-only or 0-prefixed local
  const digits = n.replace(/^\+/, "");
  // if starts with 0 and is 11 digits like 03001234567 -> convert to 92...
  if (/^0\d{10}$/.test(digits)) {
    return "92" + digits.slice(1);
  }
  // if already 11-15 digits (e.g. 92300...) return as-is
  if (/^\d{11,15}$/.test(digits)) return digits;
  return null;
}
