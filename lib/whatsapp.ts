export function toWhatsAppNumber(phone: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^0-9+]/g, "");
  // remove leading + if present
  const cleaned = digits.replace(/^\+/, "");
  // if starts with 0, replace with 92
  let result = cleaned;
  if (/^0/.test(cleaned)) {
    result = '92' + cleaned.replace(/^0+/, '');
  }
  // if starts with 92 already, keep
  if (/^92/.test(result)) {
    // ok
  }
  // ensure only digits
  result = result.replace(/\D/g, '');
  if (result.length < 11) return null;
  return result;
}
