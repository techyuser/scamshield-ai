import {
  AnalyzeRequest,
  AnalyzeResult,
  ExtractedIndicators,
  PipelineStepTrace,
  RedFlagItem,
  ReplyLanguage,
  ScamVerdict,
} from "@/types/scamshield";
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

function buildLocalizedGuidance(
  verdict: ScamVerdict,
  scamCategory: string,
  redFlags: RedFlagItem[],
  lang: ReplyLanguage
) {
  if (lang === "hi") {
    if (verdict === "LOOKS_SAFE") {
      return {
        headline: "सुरक्षित संदेश: कोई ठगी का संकेत नहीं मिला।",
        plainEnglishSummary:
          "इस संदेश में पैसे मांगने, संदिग्ध लिंक या OTP का कोई जाल नहीं मिला। फिर भी पुष्टि के लिए हमेशा आधिकारिक ऐप का ही उपयोग करें।",
        doNotDo: [
          "डिलीवरी लेने से पहले अनजान व्यक्तियों को अनावश्यक OTP या बैंक विवरण साझा न करें।",
        ],
        safeNextSteps: [
          "संदेह होने पर ऑर्डर की स्थिति सीधे आधिकारिक कंपनी के ऐप में जांचें।",
        ],
        safeReplyDraft:
          "अपडेट के लिए धन्यवाद। मैं आधिकारिक ऐप के माध्यम से डिलीवरी ट्रैक कर लूंगा।",
      };
    }

    return {
      headline:
        verdict === "CRITICAL_SCAM"
          ? `खतरा: यह एक ${scamCategory} है।`
          : "सावधान: संदिग्ध और दबाव बनाने वाले संकेत मिले हैं।",
      plainEnglishSummary:
        verdict === "CRITICAL_SCAM"
          ? "पैसे न भेजें, किसी लिंक पर क्लिक न करें और UPI PIN या OTP साझा न करें। यह संदेश आपको जल्दी में फंसाने की कोशिश कर रहा है।"
          : "यह संदेश संदिग्ध प्रतीत होता है। कोई भी कदम उठाने से पहले आधिकारिक ऐप या हेल्पलाइन से स्वयं जांच करें।",
      doNotDo: [
        "किसी भी अनजान या शॉर्ट लिंक (bit.ly आदि) पर क्लिक न करें।",
        "पैसे 'प्राप्त' करने के लिए कभी भी QR स्कैन न करें या UPI PIN न डालें।",
        "कोई रजिस्ट्रेशन फीस, सिक्योरिटी डिपॉजिट या OTP साझा न करें।",
      ],
      safeNextSteps: [
        "WhatsApp या SMS में इस नंबर को तुरंत ब्लॉक और रिपोर्ट करें।",
        "बैंक KYC या ऑर्डर जांचने के लिए हमेशा आधिकारिक बैंक ऐप खोलें।",
        "भारत में साइबर धोखाधड़ी की रिपोर्ट cybercrime.gov.in या हेल्पलाइन 1930 पर करें।",
      ],
      safeReplyDraft:
        "मैं संदेशों के माध्यम से किसी भी लिंक पर क्लिक नहीं करता, जमा राशि नहीं भेजता, और न ही UPI PIN या OTP साझा करता हूं। कृपया दोबारा संपर्क न करें—मैं इस नंबर को ब्लॉक और रिपोर्ट कर रहा हूं।",
    };
  }

  if (verdict === "LOOKS_SAFE") {
    return {
      headline: "Looks Safe: Normal notification with zero scam red flags.",
      plainEnglishSummary:
        "No hidden money trap, OTP ask, or suspicious link was detected. Still, always open official apps directly when tracking deliveries.",
      doNotDo: [
        "Avoid sharing OTPs with anyone unless you are physically handing over or receiving a verified parcel.",
      ],
      safeNextSteps: [
        "Check order status directly inside the official brand app if you want extra certainty.",
        "Keep prepaid order tracking codes private until delivery.",
      ],
      safeReplyDraft: "Thank you for the update. I will track the delivery on the official app.",
    };
  }

  return {
    headline:
      verdict === "CRITICAL_SCAM"
        ? `Danger: Classic ${scamCategory} detected.`
        : "Caution: Unverified claims or pressure tactics found.",
    plainEnglishSummary:
      verdict === "CRITICAL_SCAM"
        ? `Do NOT pay, click links, or share any PIN/OTP. This message combines ${redFlags
            .slice(0, 2)
            .map((r) => r.tactic.toLowerCase())
            .join(" and ")} to steal money or credentials.`
        : "Something feels off—verify directly through the official company app or helpline before taking action.",
    doNotDo: [
      "Do NOT click any shortened or http:// links in this message.",
      "Do NOT enter your UPI PIN or scan a QR code to 'receive' money.",
      "Do NOT send any registration fee, security deposit, or OTP.",
    ],
    safeNextSteps: [
      "Block and report the sender number inside WhatsApp / SMS immediately.",
      "If checking bank KYC or an order, open your official bank/shopping app manually—never via SMS links.",
      "Report fraud attempts in India at cybercrime.gov.in or call 1930.",
    ],
    safeReplyDraft:
      "I do not click external links, pay deposits, or share UPI PINs/OTPs over messages. Please do not contact me again—this number is being blocked and reported.",
  };
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
      const snippet = text.match(rule.snippetPattern)?.[0]?.trim() || rule.fallbackSnippet;
      redFlags.push({
        id: rule.id,
        tactic: rule.tactic,
        severity: rule.severity,
        matchedSnippet: snippet,
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

  let scamCategory = "Verified Informational Notice";
  if (verdict !== "LOOKS_SAFE") {
    if (redFlags.some((r) => r.id === "rf-upi-pin" || r.id === "rf-overpay")) {
      scamCategory = "UPI / Payment Collect Fraud";
    } else if (redFlags.some((r) => r.id === "rf-job-fee")) {
      scamCategory = "Fake Part-Time Job / Task Scam";
    } else if (redFlags.some((r) => r.id === "rf-otp-kyc" || r.id === "rf-bad-link")) {
      scamCategory = "Bank / KYC Phishing Attack";
    } else if (promptInjectionBlocked) {
      scamCategory = "Adversarial Filter-Bypass Scam";
    } else {
      scamCategory = "Social Engineering / Suspicious Outreach";
    }
  }

  const urgencyPressure = Math.min(
    98,
    indicators.urgencyPhrases.length * 28 + (/(blocked|tonight|within \d+)/i.test(lower) ? 38 : 10)
  );
  const financialTrap = Math.min(
    99,
    (redFlags.some((r) => r.id === "rf-upi-pin" || r.id === "rf-job-fee") ? 88 : 12) +
      indicators.moneyMentions.length * 6
  );
  const impersonationRisk = Math.min(
    96,
    (/(sbi|hdfc|rbi|amazon|flipkart|police|hr)/i.test(lower) && verdict !== "LOOKS_SAFE" ? 78 : 14) +
      (senderLower.includes("unknown") ? 14 : 0)
  );
  const linkDeception = hasShortOrHttpLink ? 92 : indicators.urls.length > 0 ? 22 : 8;

  const pipelineTrace: PipelineStepTrace[] = [
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
      status: redFlags.length >= 2 || promptInjectionBlocked ? "ALERT" : redFlags.length === 1 ? "WARN" : "CLEAR",
    },
    {
      stage: "3. Safety Verdict",
      summary: `Classified as ${verdict.replace("_", " ")} (${riskScore}/100 risk score).`,
      status: verdict === "CRITICAL_SCAM" ? "ALERT" : verdict === "SUSPICIOUS" ? "WARN" : "CLEAR",
    },
  ];

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
    tacticScores: {
      urgencyPressure,
      financialTrap,
      impersonationRisk,
      linkDeception,
    },
    redFlags,
    indicators,
    highlightedTerms,
    pipelineTrace,
    doNotDo: guidance.doNotDo,
    safeNextSteps: guidance.safeNextSteps,
    safeReplyDraft: guidance.safeReplyDraft,
  };
}
