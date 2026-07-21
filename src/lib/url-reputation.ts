// Isomorphic (server + client) URL reputation heuristics — no external API required.

export type UrlRisk = "Safe" | "Low" | "Medium" | "High" | "Critical";

export interface UrlFlag {
  url: string;
  domain: string;
  risk: UrlRisk;
  score: number; // 0-100
  reasons: string[];
  source: "text" | "qr";
}

// Common URL shorteners (higher risk because they hide the destination)
const SHORTENERS = new Set([
  "bit.ly", "t.co", "tinyurl.com", "goo.gl", "ow.ly", "buff.ly", "is.gd",
  "cutt.ly", "rebrand.ly", "shorturl.at", "rb.gy", "t.ly", "s.id",
  "tiny.cc", "bl.ink", "lnkd.in", "trib.al", "adf.ly", "clck.ru",
]);

// TLDs abused disproportionately by scams/phishing
const SUSPICIOUS_TLDS = new Set([
  "zip", "mov", "xyz", "top", "click", "loan", "work", "gq", "cf", "ml",
  "tk", "ga", "country", "kim", "science", "cricket", "review", "party",
  "download", "stream", "racing", "faith", "date", "win",
]);

// Words often used in credential-harvesting or brand-impersonation domains
const SUSPICIOUS_KEYWORDS = [
  "login", "verify", "secure", "account", "update", "confirm", "signin",
  "wallet", "unlock", "bank", "billing", "invoice", "reset", "auth",
  "support", "helpdesk", "recovery", "activate", "webscr",
];

// Brands commonly impersonated
const IMPERSONATED_BRANDS = [
  "paypal", "apple", "microsoft", "google", "amazon", "netflix", "facebook",
  "instagram", "whatsapp", "chase", "wellsfargo", "hsbc", "dhl", "fedex",
  "ups", "usps", "coinbase", "binance", "metamask",
];

const URL_REGEX =
  /\b((?:https?:\/\/|www\.)[^\s<>"'`]+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>"'`]*)?)/gi;

export function extractUrls(text: string): string[] {
  const found = new Set<string>();
  const matches = text.match(URL_REGEX) ?? [];
  for (const raw of matches) {
    let cleaned = raw.replace(/[.,;:!?)"'\]]+$/g, "");
    if (!/^https?:\/\//i.test(cleaned)) cleaned = `http://${cleaned}`;
    try {
      const u = new URL(cleaned);
      if (u.hostname.includes(".")) found.add(u.toString().replace(/\/$/, ""));
    } catch {
      // ignore
    }
  }
  return Array.from(found);
}

function isIpHost(host: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(host) || /^\[?[0-9a-f:]+\]?$/i.test(host);
}

function hasHomoglyphs(host: string): boolean {
  // Punycode or non-ASCII characters in hostname
  return /xn--/i.test(host) || /[^\x00-\x7F]/.test(host);
}

function levelFromScore(score: number): UrlRisk {
  if (score >= 86) return "Critical";
  if (score >= 61) return "High";
  if (score >= 31) return "Medium";
  if (score >= 10) return "Low";
  return "Safe";
}

export function analyzeUrl(rawUrl: string, source: UrlFlag["source"] = "text"): UrlFlag {
  const reasons: string[] = [];
  let score = 0;
  let normalized = rawUrl.trim();
  if (!/^https?:\/\//i.test(normalized)) normalized = `http://${normalized}`;

  let u: URL;
  try {
    u = new URL(normalized);
  } catch {
    return {
      url: rawUrl,
      domain: rawUrl,
      risk: "Medium",
      score: 45,
      reasons: ["Malformed URL"],
      source,
    };
  }

  const host = u.hostname.toLowerCase();
  const path = u.pathname + u.search;
  const tld = host.split(".").pop() ?? "";

  if (u.protocol === "http:") {
    reasons.push("Uses insecure HTTP (no TLS)");
    score += 15;
  }
  if (isIpHost(host)) {
    reasons.push("IP address instead of a domain name");
    score += 40;
  }
  if (hasHomoglyphs(host)) {
    reasons.push("Punycode / non-ASCII characters in domain");
    score += 35;
  }
  if (u.username || u.password) {
    reasons.push("Credentials embedded in URL");
    score += 45;
  }
  if (SHORTENERS.has(host)) {
    reasons.push("Link shortener hides the real destination");
    score += 30;
  }
  if (SUSPICIOUS_TLDS.has(tld)) {
    reasons.push(`Suspicious top-level domain (.${tld})`);
    score += 25;
  }
  if (host.split(".").length >= 4) {
    reasons.push("Deeply nested subdomains");
    score += 10;
  }
  if (host.length > 40) {
    reasons.push("Unusually long domain name");
    score += 10;
  }
  if (/(--|-\d+-)/.test(host)) {
    reasons.push("Suspicious hyphen patterns in domain");
    score += 8;
  }
  if (path.length > 60) {
    reasons.push("Unusually long URL path / query");
    score += 5;
  }
  if (u.port && !["80", "443", "8080"].includes(u.port)) {
    reasons.push(`Non-standard port (${u.port})`);
    score += 10;
  }

  const hostForKeywords = host.replace(/\./g, " ");
  const brandHit = IMPERSONATED_BRANDS.find(
    (b) => hostForKeywords.includes(b) && !host.endsWith(`${b}.com`) && host !== b,
  );
  if (brandHit) {
    reasons.push(`Impersonates a known brand (${brandHit})`);
    score += 35;
  }
  const keywordHit = SUSPICIOUS_KEYWORDS.find((k) => hostForKeywords.includes(k));
  if (keywordHit) {
    reasons.push(`Credential-harvest keyword in domain ("${keywordHit}")`);
    score += 20;
  }

  score = Math.min(100, score);

  if (source === "qr" && score < 15) {
    reasons.push("Delivered via QR code — always verify before opening");
    score = Math.max(score, 15);
  }

  return {
    url: u.toString().replace(/\/$/, ""),
    domain: host,
    risk: levelFromScore(score),
    score,
    reasons: reasons.length ? reasons : ["No obvious red flags detected"],
    source,
  };
}

export function analyzeTextForUrls(text: string, source: UrlFlag["source"] = "text"): UrlFlag[] {
  return extractUrls(text).map((url) => analyzeUrl(url, source));
}

export function worstRisk(flags: UrlFlag[]): UrlRisk {
  const order: UrlRisk[] = ["Safe", "Low", "Medium", "High", "Critical"];
  let idx = 0;
  for (const f of flags) idx = Math.max(idx, order.indexOf(f.risk));
  return order[idx];
}
