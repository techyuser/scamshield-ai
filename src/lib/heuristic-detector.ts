import type {
  AnalyzeRequest,
  AnalyzeResult,
  ExtractedIndicators,
  PipelineStepTrace,
  RedFlagItem,
  ReplyLanguage,
  ScamVerdict,
  TacticScores,
} from "@/types/scamshield";
import { RISK_THRESHOLDS } from "./constants";
import { buildLocalizedGuidance } from "./localized-guidance";
import { SCAM_RULES } from "./scam-rules";

const SHORT_OR_UNSAFE_URL_RE = /(bit\.ly|tinyurl|rb\.gy|ngrok|\.xyz|\.top|^http:\/\/)/i;
const SAFE_CONTROL_RE =
  /(no payment|prepaid|official.*app|bluedart\.com|amazon\.in|flipkart\.com)/i;
const BRAND_SPOOF_DOMAIN_RE =
  /(sbi|hdfc|icici|axis|paytm|phonepe|gpay|amazon|flipkart|rbi|npci).*(kyc|verify|update|refund|claim|bonus)/i;

function extractDomain(rawUrl: string): string | null {
  try {
    const normalized = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    const host = new URL(normalized).hostname.toLowerCase();
    return host || null;
  } catch {
    return null;
  }
}

/**
 * Extracts defanged URLs, host domains, currency amounts, phone numbers, and urgency tokens.
 */
export function extractIndicators(message: string): ExtractedIndicators {
  const rawUrls = message.match(/https?:\/\/[^\s]+|(?:bit\.ly|tinyurl\.com|rb\.gy)\/[^\s]+/gi) || [];
  const urls = Array.from(
    new Set(rawUrls.map((u) => u.replace(/[),.!?;:'"]+$/, "")).filter(Boolean))
  );
  const defangedHosts =
    message.match(/\b[a-z0-9-]+(?:\[\.\]|\.)(?:top|xyz|site|online|click|link|tk)\b/gi) || [];
  const domains = Array.from(
    new Set([
      ...urls.map(extractDomain).filter((d): d is string => Boolean(d)),
      ...defangedHosts.map((h) => h.replace(/\[\.\]/g, ".").toLowerCase()),
    ])
  );
  const moneyMentions = message.match(/(?:₹|rs\.?|inr|\$)\s?[\d,]+/gi) || [];
  const phoneNumbers = message.match(/(?:\+?\d{1,3}[-\s]?)?\b\d{5}[-\s]?\d{5}\b/g) || [];
  const urgencyMatches =
    message.match(
      /\b(immediately|urgent|within \d+ hours?|tonight|blocked|suspended|last warning|right now|quickly)\b/gi
    ) || [];

  return {
    urls,
    domains,
    moneyMentions: Array.from(new Set(moneyMentions)),
    phoneNumbers: Array.from(new Set(phoneNumbers)),
    urgencyPhrases: Array.from(new Set(urgencyMatches)),
  };
}

function classifyScamCategory(
  verdict: ScamVerdict,
  redFlags: RedFlagItem[],
  promptInjectionBlocked: boolean
): string {
  if (verdict === "LOOKS_SAFE") return "Verified Informational Notice";
  if (redFlags.some((r) => r.id === "rf-prize-lure")) {
    return "Fake Prize / Lottery Scam";
  }
  if (redFlags.some((r) => r.id === "rf-upi-pin" || r.id === "rf-overpay")) {
    return "UPI / Payment Collect Fraud";
  }
  if (redFlags.some((r) => r.id === "rf-digital-arrest")) {
    return "Digital Arrest / Fake Police Extortion";
  }
  if (redFlags.some((r) => r.id === "rf-job-fee")) return "Fake Part-Time Job / Task Scam";
  if (redFlags.some((r) => r.id === "rf-otp-kyc" || r.id === "rf-bad-link")) {
    return "Bank / KYC Phishing Attack";
  }
  if (promptInjectionBlocked) return "Adversarial Filter-Bypass Scam";
  return "Social Engineering / Suspicious Outreach";
}

function computeTacticScores(
  lower: string,
  senderLower: string,
  verdict: ScamVerdict,
  indicators: ExtractedIndicators,
  redFlags: RedFlagItem[],
  hasShortOrHttpLink: boolean
): TacticScores {
  return {
    urgencyPressure: Math.min(
      98,
      indicators.urgencyPhrases.length * 28 +
        (/(blocked|tonight|within \d+)/i.test(lower) ? 38 : 10)
    ),
    financialTrap: Math.min(
      99,
      (redFlags.some((r) => r.id === "rf-upi-pin" || r.id === "rf-job-fee") ? 88 : 12) +
        indicators.moneyMentions.length * 6
    ),
    impersonationRisk: Math.min(
      96,
      (/(sbi|hdfc|rbi|amazon|flipkart|police|cbi|ncb|cyber cell|customs|hr)/i.test(lower) &&
      verdict !== "LOOKS_SAFE"
        ? 78
        : 14) + (senderLower.includes("unknown") ? 14 : 0)
    ),
    linkDeception: hasShortOrHttpLink ? 92 : indicators.urls.length > 0 ? 22 : 8,
  };
}

function buildPipelineTrace(
  indicators: ExtractedIndicators,
  redFlags: RedFlagItem[],
  hasShortOrHttpLink: boolean,
  promptInjectionBlocked: boolean,
  verdict: ScamVerdict,
  riskScore: number
): PipelineStepTrace[] {
  return [
    {
      stage: "1. Link & Money Scanner",
      summary: `Extracted ${indicators.urls.length} link(s), ${indicators.moneyMentions.length} money mention(s), and ${indicators.urgencyPhrases.length} urgency trigger(s).`,
      status: hasShortOrHttpLink || indicators.moneyMentions.length > 0 ? "ALERT" : "CLEAR",
    },
    {
      stage: "2. Manipulation & Injection Guard",
      summary: promptInjectionBlocked
        ? "Neutralized embedded AI bypass prompt inside message text!"
        : redFlags.length > 0
        ? `Detected ${redFlags.length} social-engineering red flag(s) (${redFlags[0].tactic}).`
        : "No coercion, upfront fee, or credential-theft pattern found.",
      status:
        redFlags.length >= 2 || promptInjectionBlocked
          ? "ALERT"
          : redFlags.length === 1
          ? "WARN"
          : "CLEAR",
    },
    {
      stage: "3. Safety Verdict",
      summary: `Classified as ${verdict.replace("_", " ")} (${riskScore}/100 risk score).`,
      status: verdict === "CRITICAL_SCAM" ? "ALERT" : verdict === "SUSPICIOUS" ? "WARN" : "CLEAR",
    },
  ];
}

/**
 * Deterministic multi-stage scam detector guaranteeing resilient operation offline
 * or when Gemini quota/API keys are unavailable.
 */
export function analyzeMessageDeterministic(
  req: AnalyzeRequest,
  startedAt = Date.now()
): AnalyzeResult {
  const rawText = req.message.trim();
  const hasZeroWidthSmuggling = /[\u200B-\u200D\uFEFF]/.test(rawText);
  const text = rawText.replace(/[\u200B-\u200D\uFEFF]/g, "");
  const lower = text.toLowerCase();
  const senderLower = (req.senderInfo || "").toLowerCase();
  const language: ReplyLanguage = req.language === "hi" ? "hi" : "en";
  const indicators = extractIndicators(text);

  const redFlags: RedFlagItem[] = [];
  let riskPoints = 8;

  if (hasZeroWidthSmuggling) {
    riskPoints += 30;
    redFlags.push({
      id: "rf-zero-width",
      tactic: "Invisible Unicode Smuggling",
      severity: "HIGH",
      matchedSnippet: "Hidden zero-width characters",
      explanation:
        "Contains invisible zero-width characters commonly used to evade keyword filters and trick AI classifiers.",
    });
  }

  for (const rule of SCAM_RULES) {
    if (rule.pattern.test(lower)) {
      riskPoints += rule.weight;
      redFlags.push({
        id: rule.id,
        tactic: rule.tactic,
        severity: rule.severity,
        matchedSnippet: text.match(rule.snippetPattern)?.[0]?.trim() || rule.fallbackSnippet,
        explanation: rule.explanation,
      });
    }
  }

  const hasShortOrHttpLink =
    indicators.urls.some((u) => SHORT_OR_UNSAFE_URL_RE.test(u) || BRAND_SPOOF_DOMAIN_RE.test(u)) ||
    indicators.domains.some((d) => SHORT_OR_UNSAFE_URL_RE.test(d) || BRAND_SPOOF_DOMAIN_RE.test(d));
  if (hasShortOrHttpLink) {
    riskPoints += 26;
    redFlags.push({
      id: "rf-bad-link",
      tactic: "Masked / Unsecured Phishing Link",
      severity: "HIGH",
      matchedSnippet: indicators.urls[0] || indicators.domains[0] || "Suspicious link",
      explanation:
        "Uses a URL shortener, lookalike slug, or unencrypted http:// link to disguise the real website domain instead of an official bank/brand domain.",
    });
  }

  if (/(telegram|@\w+|whatsapp me)/i.test(lower) || /\+44|\+1|\+92|\+84/.test(senderLower)) {
    riskPoints += 16;
    redFlags.push({
      id: "rf-offplatform",
      tactic: "Unverified Off-Platform Redirect",
      severity: "MEDIUM",
      matchedSnippet:
        text.match(/(?:telegram\s+@?\w+|@\w+)/i)?.[0] ||
        req.senderInfo ||
        "Unknown foreign sender",
      explanation:
        "Legitimate HR teams and banks do not conduct official onboarding or payouts through anonymous Telegram handles.",
    });
  }

  if (req.imageBase64 && redFlags.length === 0 && text.length < 25) {
    riskPoints += 28;
    redFlags.push({
      id: "rf-image-only",
      tactic: "Screenshot Verification Needed",
      severity: "MEDIUM",
      matchedSnippet: "Attached screenshot",
      explanation:
        "Image-only scan running in offline heuristic mode—connect a Gemini API key in Engine Settings to run OCR + visual QR analysis on screenshots.",
    });
  }

  if (redFlags.length === 0 && SAFE_CONTROL_RE.test(lower)) {
    riskPoints = 6;
  }

  const promptInjectionBlocked = redFlags.some((r) => r.id === "rf-prompt-injection");
  const baseScore = Math.min(RISK_THRESHOLDS.MAX_SCORE, Math.max(RISK_THRESHOLDS.MIN_SCORE, riskPoints));
  const riskScore = promptInjectionBlocked
    ? Math.max(RISK_THRESHOLDS.PROMPT_INJECTION_FLOOR, baseScore)
    : baseScore;

  const verdict: ScamVerdict =
    riskScore >= RISK_THRESHOLDS.CRITICAL
      ? "CRITICAL_SCAM"
      : riskScore >= RISK_THRESHOLDS.SUSPICIOUS
      ? "SUSPICIOUS"
      : "LOOKS_SAFE";

  const scamCategory = classifyScamCategory(verdict, redFlags, promptInjectionBlocked);
  const highlightedTerms = Array.from(
    new Set([
      ...indicators.urls,
      ...indicators.moneyMentions,
      ...indicators.urgencyPhrases,
      ...redFlags.map((r) => r.matchedSnippet).filter((s) => s.length >= 4 && text.includes(s)),
    ])
  ).slice(0, 8);

  const guidance = buildLocalizedGuidance(verdict, scamCategory, redFlags, language);

  return {
    engine: "deterministic-fallback",
    latencyMs: Math.max(1, Date.now() - startedAt),
    language,
    promptInjectionBlocked,
    verdict,
    riskScore,
    scamCategory,
    headline: guidance.headline,
    plainEnglishSummary: guidance.plainEnglishSummary,
    tacticScores: computeTacticScores(
      lower,
      senderLower,
      verdict,
      indicators,
      redFlags,
      hasShortOrHttpLink
    ),
    redFlags,
    indicators,
    highlightedTerms,
    pipelineTrace: buildPipelineTrace(
      indicators,
      redFlags,
      hasShortOrHttpLink,
      promptInjectionBlocked,
      verdict,
      riskScore
    ),
    doNotDo: guidance.doNotDo,
    safeNextSteps: guidance.safeNextSteps,
    safeReplyDraft: guidance.safeReplyDraft,
  };
}
