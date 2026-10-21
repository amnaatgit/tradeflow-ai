/**
 * "Rs 3,200". Pass { lakh: true } for South Asian grouping: "Rs 1,25,000".
 * Rounds to whole rupees unless { decimals } is given.
 */
export function formatPKR(amount: number, opts: { lakh?: boolean; decimals?: number } = {}): string {
  const decimals = opts.decimals ?? 0;
  const sign = amount < 0 ? "-" : "";
  const fixed = Math.abs(amount).toFixed(decimals);
  const [int, frac] = fixed.split(".");
  let grouped: string;
  if (opts.lakh && int.length > 3) {
    const last3 = int.slice(-3);
    const rest = int.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    grouped = `${rest},${last3}`;
  } else {
    grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  return `${sign}Rs ${grouped}${frac ? "." + frac : ""}`;
}

const UNITS: Record<string, number> = {
  ek: 1, aik: 1, one: 1,
  do: 2, two: 2,
  teen: 3, three: 3,
  char: 4, chaar: 4, four: 4,
  panch: 5, paanch: 5, five: 5,
  chay: 6, che: 6, chhe: 6, six: 6,
  saat: 7, seven: 7,
  aath: 8, aat: 8, eight: 8,
  nau: 9, nine: 9,
  das: 10, dus: 10, ten: 10,
  barah: 12, baara: 12, darjan: 12, dozen: 12, darzan: 12,
  bees: 20, twenty: 20,
  pachas: 50, pachaas: 50, fifty: 50,
};

// Fractions used before a multiplier: "dedh sau" = 150, "dhai hazar" = 2500.
const FRACTIONS: Record<string, number> = { adha: 0.5, aadha: 0.5, dedh: 1.5, derh: 1.5, dhai: 2.5, dhaai: 2.5, adhai: 2.5 };
// "sawa do sau" = 225 (x 1.25), "paune do sau" = 175 (x 0.875 of 2 = 2 - 0.25).
const MULTIPLIERS: Record<string, number> = {
  sau: 100, hundred: 100,
  hazar: 1000, hazaar: 1000, hajar: 1000, thousand: 1000, k: 1000,
  lakh: 100000, lac: 100000, lakhs: 100000,
  crore: 10000000, karor: 10000000,
};

/**
 * Parses money/quantity the way people write it in chats:
 * "3,200", "Rs. 1500", "1.5k", "2 hazar", "dhai hazar", "dedh sau", "sawa do sau", "paune 2 hazar",
 * "2 lakh 50 hazar", "do darjan" (24). Returns null if no amount is found.
 */
export function parseAmount(text: string | null | undefined): number | null {
  if (!text) return null;
  const t = text
    .toLowerCase()
    .replace(/rs\.?|pkr|rupay|rupees?|\/-/g, " ")
    .replace(/(\d),(\d)/g, "$1$2")
    .replace(/(\d)\s*k\b/g, "$1 k")
    .trim();
  const tokens = t.split(/[^a-z0-9.]+/).filter(Boolean);
  if (!tokens.length) return null;

  let total = 0;
  let current: number | null = null;
  let modifier: "sawa" | "paune" | null = null;
  let found = false;

  for (const tok of tokens) {
    const num = /^\d+(\.\d+)?$/.test(tok) ? Number(tok) : UNITS[tok] ?? FRACTIONS[tok];
    if (tok === "sawa") { modifier = "sawa"; continue; }
    if (tok === "paune" || tok === "pone") { modifier = "paune"; continue; }
    if (num !== undefined) {
      // "darjan" right after a number multiplies it: "do darjan" = 24.
      if ((tok === "darjan" || tok === "dozen" || tok === "darzan") && current !== null) {
        current *= 12;
      } else {
        current = (current ?? 0) + num;
      }
      found = true;
      continue;
    }
    const mult = MULTIPLIERS[tok];
    if (mult !== undefined) {
      let base = current ?? 1;
      if (modifier === "sawa") base += 0.25;
      if (modifier === "paune") base -= 0.25;
      modifier = null;
      total += base * mult;
      current = null;
      found = true;
    }
  }
  if (current !== null) total += current;
  return found ? Math.round(total * 100) / 100 : null;
}
