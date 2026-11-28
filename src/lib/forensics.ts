export interface ParsedUpiIntent {
  rawUri: string;
  payeeVpa: string | null;
  payeeName: string | null;
  amount: string | null;
  note: string | null;
  isPullTrap: boolean;
}

export interface DomainForensicItem {
  domain: string;
  status: "VERIFIED_OFFICIAL" | "SHORTENER" | "HOMOGLYPH_SPOOF" | "BRAND_LOOKALIKE" | "UNVERIFIED";
  badge: string;
  detail: string;
}

const OFFICIAL_BRAND_DOMAINS: Array<{ brand: string; domains: string[]; keyword: RegExp }> = [
  { brand: "SBI", domains: ["sbi.co.in", "onlinesbi.sbi"], keyword: /\bsbi|yono/i },
  { brand: "HDFC Bank", domains: ["hdfcbank.com"], keyword: /hdfc/i },
  { brand: "ICICI Bank", domains: ["icicibank.com"], keyword: /icici/i },
  { brand: "Axis Bank", domains: ["axisbank.com"], keyword: /axis/i },
  { brand: "Amazon", domains: ["amazon.in", "amazon.com"], keyword: /amazon/i },
  { brand: "Flipkart", domains: ["flipkart.com"], keyword: /flipkart/i },
  { brand: "BlueDart", domains: ["bluedart.com"], keyword: /bluedart/i },
  { brand: "Paytm", domains: ["paytm.com"], keyword: /paytm/i },
  { brand: "PhonePe", domains: ["phonepe.com"], keyword: /phonepe/i },
  { brand: "NPCI / UPI", domains: ["npci.org.in"], keyword: /npci|upi/i },
  { brand: "I4C Cybercrime", domains: ["cybercrime.gov.in"], keyword: /cybercrime/i },
];

const SHORTENER_DOMAINS = new Set(["bit.ly", "tinyurl.com", "rb.gy", "t.co", "goo.gl", "is.gd"]);

/**
 * Parses `upi://pay` deep-links or raw UPI IDs from a message so consumers see exact debit fields.
 */
export function parseUpiPaymentUri(text: string): ParsedUpiIntent | null {
  const uriMatch = text.match(/upi:\/\/pay\?[^\s]+/i);
  if (uriMatch) {
    try {
      const normalized = uriMatch[0].replace(/^upi:\/\/pay/i, "https://upi.local/pay");
      const url = new URL(normalized);
      return {
        rawUri: uriMatch[0],
        payeeVpa: url.searchParams.get("pa"),
        payeeName: url.searchParams.get("pn"),
        amount: url.searchParams.get("am"),
        note: url.searchParams.get("tn"),
        isPullTrap: true,
      };
    } catch {
      return null;
    }
  }

  const vpaMatch = text.match(
    /\b([a-zA-Z0-9._-]{2,}@(?:okaxis|okicici|okhdfcbank|oksbi|ybl|ibl|axl|paytm|upi))\b/i
  );
  if (vpaMatch) {
    return {
      rawUri: vpaMatch[1],
      payeeVpa: vpaMatch[1],
      payeeName: null,
      amount: null,
      note: null,
      isPullTrap: /(refund|receive|credit|cashback|deposit|pin|qr)/i.test(text),
    };
  }

  return null;
}

/**
 * Evaluates extracted domains for URL shorteners, Unicode/Punycode homoglyphs, and brand spoofing.
 */
export function inspectDomainForensics(domains: string[]): DomainForensicItem[] {
  return domains.map((domain) => {
    const clean = domain.toLowerCase();

    if (clean.startsWith("xn--") || /[^\x00-\x7F]/.test(clean)) {
      return {
        domain,
        status: "HOMOGLYPH_SPOOF",
        badge: "Homoglyph / IDN Spoof",
        detail: "Contains non-ASCII or Punycode lookalike characters used to mimic trusted brands.",
      };
    }

    if (SHORTENER_DOMAINS.has(clean)) {
      return {
        domain,
        status: "SHORTENER",
        badge: "Masked Shortener",
        detail: "Hides the true destination website behind a shortened redirect link.",
      };
    }

    for (const entry of OFFICIAL_BRAND_DOMAINS) {
      if (entry.domains.some((official) => clean === official || clean.endsWith(`.${official}`))) {
        return {
          domain,
          status: "VERIFIED_OFFICIAL",
          badge: `Verified ${entry.brand}`,
          detail: `Matches official ${entry.brand} domain (${entry.domains[0]}).`,
        };
      }
      if (entry.keyword.test(clean)) {
        return {
          domain,
          status: "BRAND_LOOKALIKE",
          badge: `Spoofs ${entry.brand}`,
          detail: `Uses "${entry.brand}" keyword, NOT official ${entry.domains.join(" / ")}.`,
        };
      }
    }

    return {
      domain,
      status: "UNVERIFIED",
      badge: "Unverified Domain",
      detail: "Not in verified Indian banking or major commerce domain registry.",
    };
  });
}
