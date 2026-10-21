export function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;
  // 923001234567 -> 03001234567
  if (/^92\d{10}$/.test(digits)) {
    return '0' + digits.slice(2);
  }
  // 3001234567 -> 03001234567
  if (/^3\d{9}$/.test(digits)) {
    return '0' + digits;
  }
  // empty -> null already handled
  return digits;
}
