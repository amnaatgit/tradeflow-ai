export type DateInput = string | number | Date;

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatDate(value: DateInput): string {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: DateInput): string {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
