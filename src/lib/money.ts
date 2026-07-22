// Parse currency amounts from arbitrary text.
// Supports $, ₹, €, £, ¥ prefix or "USD 500", "500 dollars", "Rs. 10,000", etc.

const SYMBOL_RATES: Record<string, number> = {
  // Rough USD conversion for a single "money at risk" total.
  "$": 1,
  "USD": 1,
  "US$": 1,
  "€": 1.08,
  "EUR": 1.08,
  "£": 1.27,
  "GBP": 1.27,
  "¥": 0.0067,
  "JPY": 0.0067,
  "₹": 0.012,
  "INR": 0.012,
  "Rs": 0.012,
  "RS": 0.012,
  "RS.": 0.012,
  "RS ": 0.012,
};

function toNumber(raw: string): number {
  const cleaned = raw.replace(/[,\s]/g, "");
  const n = parseFloat(cleaned);
  if (!isFinite(n)) return 0;
  return n;
}

function applyMultiplier(n: number, suffix: string): number {
  const s = suffix.toLowerCase();
  if (/^k\b/.test(s) || /thousand/.test(s)) return n * 1_000;
  if (/^m\b/.test(s) || /million/.test(s)) return n * 1_000_000;
  if (/lakh|lac/.test(s)) return n * 100_000;
  if (/crore|cr\b/.test(s)) return n * 10_000_000;
  if (/billion|bn\b/.test(s)) return n * 1_000_000_000;
  return n;
}

// Returns USD-equivalent amount extracted from text; 0 if nothing found.
export function extractMoneyUSD(text: string): number {
  if (!text) return 0;
  let total = 0;

  // Symbol-prefixed: $1,000  ₹10,000  £500.50
  const symRe = /([$₹€£¥])\s?(\d{1,3}(?:[,\s]\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\s*([a-zA-Z]{0,8})/g;
  let m: RegExpExecArray | null;
  while ((m = symRe.exec(text)) !== null) {
    const rate = SYMBOL_RATES[m[1]] ?? 1;
    total += applyMultiplier(toNumber(m[2]), m[3] ?? "") * rate;
  }

  // Code-prefixed / suffixed: USD 500, 500 USD, Rs. 1,000, 500 dollars
  const codeRe =
    /\b(USD|EUR|GBP|JPY|INR|RS\.?)\s?(\d{1,3}(?:[,\s]\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\s*([a-zA-Z]{0,8})/gi;
  while ((m = codeRe.exec(text)) !== null) {
    const key = m[1].toUpperCase().replace(/\./g, "");
    const rate = SYMBOL_RATES[key] ?? 1;
    total += applyMultiplier(toNumber(m[2]), m[3] ?? "") * rate;
  }

  const suffixRe =
    /(\d{1,3}(?:[,\s]\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\s*(dollars?|euros?|pounds?|yen|rupees?|inr|usd|eur|gbp)\b/gi;
  while ((m = suffixRe.exec(text)) !== null) {
    const word = m[2].toLowerCase();
    const rate = word.startsWith("dollar") || word === "usd"
      ? 1
      : word.startsWith("euro") || word === "eur"
      ? 1.08
      : word.startsWith("pound") || word === "gbp"
      ? 1.27
      : word === "yen"
      ? 0.0067
      : 0.012; // rupees/inr
    total += toNumber(m[1]) * rate;
  }

  return Math.round(total);
}

export function formatUSD(n: number): string {
  if (!n) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return `$${n.toLocaleString()}`;
}
