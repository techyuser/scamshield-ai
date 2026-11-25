import {
  AnalyzeRequest,
  AnalyzeResult,
  ExtractedIndicators,
  PipelineStepTrace,
  RedFlagItem,
  ReplyLanguage,
  ScamVerdict,
} from "@/types/scamshield";
import { buildLocalizedGuidance } from "./localized-guidance";
import { SCAM_RULES } from "./scam-rules";

const SHORT_OR_UNSAFE_URL_RE = /(bit\.ly|tinyurl|rb\.gy|ngrok|\.xyz|\.top|^http:\/\/)/i;
const SAFE_CONTROL_RE = /(no payment|prepaid|official.*app|bluedart\.com|amazon\.in|flipkart\.com)/i;

/**
 * Extracts URLs, currency amounts, phone numbers, and urgency tokens from raw message text.
 */
export function extractIndicators(message: string): ExtractedIndicators {
  const urls = message.match(/https?:\/\/[^\s]+|(?:bit\.ly|tinyurl\.com|rb\.gy)\/[^\s]+/gi) || [];
  const moneyMentions = message.match(/(?:₹|rs\.?|inr|\$)\s?[\d,]+/gi) || [];
  const phoneNumbers = message.match(/(?:\+?\d{1,3}[-\s]?)?\b\d{5}[-\s]?\d{5}\b/g) || [];
  const urgencyMatches =
    message.match(
      /\b(immediately|urgent|within \d+ hours?|tonight|blocked|suspended|last warning|right now|quickly)\b/gi
    ) || [];

  return {
    urls: Array.from(new Set(urls)),
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
  if (redFlags.some((r) => r.id === "rf-upi-pin" || r.id === "rf-overpay")) {
    return "UPI / Payment Collect Fraud";
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
) {
  return {
    urgencyPressure: Math.min(
      98,
      indicators.urgencyPhrases.length * 28 + (/(blocked|tonight|within \d+)/i.test(lower) ? 38 : 10)
    ),
    financialTrap: Math.min(
      99,
      (redFlags.some((r) => r.id === "rf-upi-pin" || r.id === "rf-job-fee") ? 88 : 12) +
        indicators.moneyMentions.length * 6
    ),
    impersonationRisk: Math.min(
      96,
      (/(sbi|hdfc|rbi|amazon|flipkart|police|hr)/i.test(lower) && verdict !== "LOOKS_SAFE" ? 78 : 14) +
        (senderLower.includes("unknown") ? 14 : 0)
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
 * Deterministic multi-stage scam detector that guarantees resilient operation offline
 * or when Gemini quota/API keys are unavailable.
 */
export function analyzeMessageDeterministic(
  req: AnalyzeRequest,
  startedAt = Date.now()
): AnalyzeResult {
  const text = req.message.trim();
  const lower = text.toLowerCase();
  const senderLower = (req.senderInfo || "").toLowerCase();
  const language: ReplyLanguage = req.language === "hi" ? "hi" : "en";
  const indicators = extractIndicators(text);

  const redFlags: RedFlagItem[] = [];
  let riskPoints = 8;

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

  const hasShortOrHttpLink = indicators.urls.some((u) => SHORT_OR_UNSAFE_URL_RE.test(u));
  if (hasShortOrHttpLink) {
    riskPoints += 26;
    redFlags.push({
      id: "rf-bad-link",
      tactic: "Masked / Unsecured Phishing Link",
      severity: "HIGH",
      matchedSnippet: indicators.urls[0],
      explanation:
        "Uses a URL shortener or unencrypted http:// link to disguise the real website domain instead of an official bank/brand domain.",
    });
  }

  if (/(telegram|@\w+|whatsapp me)/i.test(lower) || /\+44|\+1|\+92|\+84/.test(senderLower)) {
    riskPoints += 16;
    redFlags.push({
      id: "rf-offplatform",
      tactic: "Unverified Off-Platform Redirect",
      severity: "MEDIUM",
      matchedSnippet:
        text.match(/(?:telegram\s+@?\w+|@\w+)/i)?.[0] || req.senderInfo || "Unknown foreign sender",
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

  const riskScore = Math.min(99, Math.max(4, riskPoints));
  const verdict: ScamVerdict =
    riskScore >= 65 ? "CRITICAL_SCAM" : riskScore >= 32 ? "SUSPICIOUS" : "LOOKS_SAFE";
  const promptInjectionBlocked = redFlags.some((r) => r.id === "rf-prompt-injection");
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
    latencyMs: Math.max(120, Date.now() - startedAt + 150),
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
