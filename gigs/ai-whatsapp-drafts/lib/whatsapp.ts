// "0300-1234567" / "+92 300 1234567" -> "923001234567" (the format wa.me expects).
export function toWhatsAppNumber(raw: string | null | undefined): string | null {
  let d = (raw ?? "").replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("0092")) d = d.slice(2);
  if (/^03\d{9}$/.test(d)) return "92" + d.slice(1);
  if (/^3\d{9}$/.test(d)) return "92" + d;
  if (/^\d{11,15}$/.test(d) && !d.startsWith("0")) return d;
  return null;
}

export function whatsAppLink(phone: string | null | undefined, text: string): string | null {
  const n = toWhatsAppNumber(phone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
}
