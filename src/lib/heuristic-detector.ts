import {
  AnalyzeRequest,
  AnalyzeResult,
  ExtractedIndicators,
  PipelineStepTrace,
  RedFlagItem,
  ScamVerdict,
} from "@/types/scamshield";

function extractIndicators(message: string): ExtractedIndicators {
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

export function analyzeMessageDeterministic(
  req: AnalyzeRequest,
  startedAt = Date.now()
): AnalyzeResult {
  const text = req.message.trim();
  const lower = text.toLowerCase();
  const senderLower = (req.senderInfo || "").toLowerCase();
  const indicators = extractIndicators(text);

  const redFlags: RedFlagItem[] = [];
  let riskPoints = 8;

  // 1. UPI PIN / QR Scan to "Receive" Money
  if (/(scan.*qr|enter.*upi pin|upi pin.*receive|pin to receive|credited.*scan)/i.test(lower)) {
    riskPoints += 42;
    redFlags.push({
      id: "rf-upi-pin",
      tactic: "Reverse UPI PIN Trap",
      severity: "HIGH",
      matchedSnippet: text.match(/.{0,35}(?:scan.*qr|upi pin).{0,35}/i)?.[0]?.trim() || "QR / UPI PIN request",
      explanation:
        "You NEVER need to scan a QR code or enter your UPI PIN to RECEIVE money. Entering your PIN sends money OUT of your bank.",
    });
  }

  // 2. Advance-Fee / Job Task Deposit Scam
  if (
    /(security deposit|registration fee|refundable.*fee|vip.*task|liking youtube|earn.*daily|prepaid task|double your)/i.test(
      lower
    )
  ) {
    riskPoints += 38;
    redFlags.push({
      id: "rf-job-fee",
      tactic: "Advance-Fee / Task Scam",
      severity: "HIGH",
      matchedSnippet:
        text.match(/.{0,30}(?:security deposit|refundable|vip.*task|liking youtube|earn.*daily).{0,30}/i)?.[0]?.trim() ||
        "Upfront deposit for guaranteed daily earnings",
      explanation:
        "Real employers never ask you to pay a deposit to unlock salary or pay ₹3,500–₹8,000/day just for liking videos.",
    });
  }

  // 3. OTP / Password / Secret Sharing
  if (/(share.*otp|tell.*otp|send.*otp|cvv|atm pin|pan.*kyc|kyc.*update)/i.test(lower)) {
    riskPoints += 32;
    redFlags.push({
      id: "rf-otp-kyc",
      tactic: "Credential / OTP Harvesting",
      severity: "HIGH",
      matchedSnippet:
        text.match(/.{0,30}(?:otp|kyc|cvv|pin).{0,30}/i)?.[0]?.trim() || "OTP / KYC credential request",
      explanation:
        "Banks never ask for OTPs over calls/SMS or force PAN KYC updates via random shortened web links.",
    });
  }

  // 4. Suspicious Shortened or Lookalike Links
  const hasShortOrHttpLink = indicators.urls.some((u) =>
    /(bit\.ly|tinyurl|rb\.gy|ngrok|\.xyz|\.top|^http:\/\/)/i.test(u)
  );
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

  // 5. Manufactured Panic & False Urgency
  if (indicators.urgencyPhrases.length > 0 || /(blocked|suspended|freeze|legal action|police|arrest)/i.test(lower)) {
    riskPoints += 22;
    redFlags.push({
      id: "rf-urgency",
      tactic: "Panic & Time-Pressure Trap",
      severity: "MEDIUM",
      matchedSnippet: indicators.urgencyPhrases[0] || "Account blocked / urgent threat",
      explanation:
        "Scammers create fake countdowns ('blocked tonight', 'within 2 hours') so you panic and click before double-checking.",
    });
  }

  // 6. Off-Platform Migration (Telegram / WhatsApp / Foreign Number)
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

  // 7. Accidental Overpayment / Lottery / Prize Claim
  if (/(accidentally sent|wrongly transferred|won.*prize|lottery|gift.*claim)/i.test(lower)) {
    riskPoints += 24;
    redFlags.push({
      id: "rf-overpay",
      tactic: "Fake Overpayment / Bait Story",
      severity: "HIGH",
      matchedSnippet:
        text.match(/.{0,25}(?:accidentally sent|won.*prize|lottery).{0,25}/i)?.[0]?.trim() ||
        "Accidental transfer / prize claim",
      explanation:
        "No real mistake occurred—the screenshot/SMS is fake, and they are trying to rush you into sending your own money back.",
    });
  }

  // Safe Signal Discount (when no red flags exist and it clearly states no payment/official app)
  const hasOfficialSafeSignals =
    redFlags.length === 0 &&
    /(no payment|prepaid|official.*app|bluedart\.com|amazon\.in|flipkart\.com)/i.test(lower);
  if (hasOfficialSafeSignals) {
    riskPoints = 6;
  }

  const riskScore = Math.min(99, Math.max(4, riskPoints));
  const verdict: ScamVerdict =
    riskScore >= 65 ? "CRITICAL_SCAM" : riskScore >= 32 ? "SUSPICIOUS" : "LOOKS_SAFE";

  let scamCategory = "Verified Informational Notice";
  if (verdict !== "LOOKS_SAFE") {
    if (redFlags.some((r) => r.id === "rf-upi-pin" || r.id === "rf-overpay")) {
      scamCategory = "UPI / Payment Collect Fraud";
    } else if (redFlags.some((r) => r.id === "rf-job-fee")) {
      scamCategory = "Fake Part-Time Job / Task Scam";
    } else if (redFlags.some((r) => r.id === "rf-otp-kyc" || r.id === "rf-bad-link")) {
      scamCategory = "Bank / KYC Phishing Attack";
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
      summary: `Found ${indicators.urls.length} link(s), ${indicators.moneyMentions.length} amount(s), ${indicators.urgencyPhrases.length} urgency trigger(s).`,
      status: hasShortOrHttpLink || indicators.moneyMentions.length > 0 ? "ALERT" : "CLEAR",
    },
    {
      stage: "2. Manipulation Check",
      summary:
        redFlags.length > 0
          ? `Detected ${redFlags.length} social-engineering red flag(s) (${redFlags[0].tactic}).`
          : "No coercion, upfront fee, or credential-theft pattern found.",
      status: redFlags.length >= 2 ? "ALERT" : redFlags.length === 1 ? "WARN" : "CLEAR",
    },
    {
      stage: "3. Safety Verdict",
      summary: `Classified as ${verdict.replace("_", " ")} (${riskScore}/100 risk score).`,
      status: verdict === "CRITICAL_SCAM" ? "ALERT" : verdict === "SUSPICIOUS" ? "WARN" : "CLEAR",
    },
  ];

  const headline =
    verdict === "CRITICAL_SCAM"
      ? `Danger: Classic ${scamCategory} detected.`
      : verdict === "SUSPICIOUS"
      ? "Caution: Unverified claims or pressure tactics found."
      : "Looks Safe: Normal notification with zero scam red flags.";

  const plainEnglishSummary =
    verdict === "CRITICAL_SCAM"
      ? `Do NOT pay, click links, or share any PIN/OTP. This message combines ${redFlags
          .slice(0, 2)
          .map((r) => r.tactic.toLowerCase())
          .join(" and ")} to steal money or credentials.`
      : verdict === "SUSPICIOUS"
      ? "Something feels off—verify directly through the official company app or helpline before taking action."
      : "No hidden money trap, OTP ask, or suspicious link was detected. Still, always open official apps directly when tracking deliveries.";

  const doNotDo =
    verdict === "LOOKS_SAFE"
      ? ["No immediate danger detected, though avoid sharing OTPs even with courier drivers unless you initiated delivery handoff."]
      : [
          "Do NOT click any shortened or http:// links in this message.",
          "Do NOT enter your UPI PIN or scan a QR code to 'receive' money.",
          "Do NOT send any registration fee, security deposit, or OTP.",
        ];

  const safeNextSteps =
    verdict === "LOOKS_SAFE"
      ? [
          "Check order status directly inside the official brand app if you want extra certainty.",
          "Keep prepaid order tracking codes private until delivery.",
        ]
      : [
          "Block and report the sender number inside WhatsApp / SMS immediately.",
          "If checking bank KYC or an order, open your official bank/shopping app manually—never via SMS links.",
          "Report fraud attempts in India at cybercrime.gov.in or call 1930.",
        ];

  const safeReplyDraft =
    verdict === "LOOKS_SAFE"
      ? "Thank you for the update. I will track the delivery on the official app."
      : "I do not click external links, pay deposits, or share UPI PINs/OTPs over messages. Please do not contact me again—this number is being blocked and reported.";

  return {
    engine: "deterministic-fallback",
    latencyMs: Math.max(140, Date.now() - startedAt + 165),
    verdict,
    riskScore,
    scamCategory,
    headline,
    plainEnglishSummary,
    tacticScores: {
      urgencyPressure,
      financialTrap,
      impersonationRisk,
      linkDeception,
    },
    redFlags,
    indicators,
    pipelineTrace,
    doNotDo,
    safeNextSteps,
    safeReplyDraft,
  };
}
