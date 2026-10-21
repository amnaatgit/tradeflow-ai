// Pakistani phone numbers. Customers type them every possible way:
// "0300-1234567", "0300 1234567", "+92 300 1234567", "923001234567", "3001234567".

/** Digits only. */
export function digitsOnly(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\D/g, "");
}

/**
 * Normalise to the local 11-digit form "03001234567" so the same customer always matches.
 * Pakistani mobiles: 03XX + 7 digits. Returns the digits unchanged for other numbers,
 * and null for empty input.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  let d = digitsOnly(raw);
  if (!d) return null;
  if (d.startsWith("0092")) d = d.slice(2);
  if (/^92\d{10}$/.test(d)) return "0" + d.slice(2);
  if (/^3\d{9}$/.test(d)) return "0" + d;
  return d;
}

/** True for a valid Pakistani mobile number (03XX-XXXXXXX) in any common format. */
export function isPkMobile(raw: string | null | undefined): boolean {
  const n = normalizePhone(raw);
  return !!n && /^03\d{9}$/.test(n);
}

/** "+923001234567" for SMS gateways and APIs; null if not a Pakistani mobile. */
export function toE164(raw: string | null | undefined): string | null {
  const n = normalizePhone(raw);
  return n && /^03\d{9}$/.test(n) ? "+92" + n.slice(1) : null;
}

/** Display form "0300-1234567"; falls back to the normalised digits for other numbers. */
export function formatPhone(raw: string | null | undefined): string {
  const n = normalizePhone(raw);
  if (!n) return "";
  return /^03\d{9}$/.test(n) ? `${n.slice(0, 4)}-${n.slice(4)}` : n;
}
