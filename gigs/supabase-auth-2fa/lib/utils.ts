export function formatPhone(phone: string | null | undefined) {
  if (!phone) return null;
  return phone.replace(/[^0-9+]/g, "");
}
