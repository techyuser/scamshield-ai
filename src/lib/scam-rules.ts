import type { RedFlagItem } from "@/types/scamshield";

export interface ScamRule {
  id: string;
  tactic: string;
  severity: RedFlagItem["severity"];
  weight: number;
  pattern: RegExp;
  snippetPattern: RegExp;
  fallbackSnippet: string;
  explanation: string;
}

/**
 * Declarative scam-pattern table shared by the deterministic fraud engine and tests.
 */
export const SCAM_RULES: ScamRule[] = [
  {
    id: "rf-prompt-injection",
    tactic: "AI Filter Bypass Attempt",
    severity: "HIGH",
    weight: 45,
    pattern:
      /(ignore (all )?previous instructions|mark (this|message) as safe|riskscore\s*[:=]\s*0|system prompt|override (safety|instructions)|<\/untrusted_message>|"verdict"\s*:\s*"looks_safe")/i,
    snippetPattern:
      /.{0,20}(?:ignore (?:all )?previous instructions|mark (?:this|message) as safe|riskscore\s*[:=]\s*0|system prompt|override (?:safety|instructions)|<\/untrusted_message>|"verdict"\s*:\s*"looks_safe").{0,25}/i,
    fallbackSnippet: "Embedded AI override instruction",
    explanation:
      "The message contains hidden instructions attempting to trick AI scam filters into marking a dangerous message as safe.",
  },
  {
    id: "rf-upi-pin",
    tactic: "Reverse UPI PIN Trap",
    severity: "HIGH",
    weight: 42,
    pattern: /(scan.*qr|enter.*upi pin|upi pin.*receive|pin to receive|credited.*scan)/i,
    snippetPattern: /.{0,30}(?:scan.*qr|upi pin).{0,30}/i,
    fallbackSnippet: "QR / UPI PIN request",
    explanation:
      "You NEVER need to scan a QR code or enter your UPI PIN to RECEIVE money. Entering your PIN sends money OUT of your bank.",
  },
  {
    id: "rf-digital-arrest",
    tactic: "Fake Police / Digital Arrest Extortion",
    severity: "HIGH",
    weight: 42,
    pattern:
      /(digital arrest|mumbai cyber cell|\bcbi\b|\bncb\b|enforcement directorate|customs parcel|arrest warrant|money laundering|skype.*call)/i,
    snippetPattern:
      /.{0,25}(?:digital arrest|cyber cell|cbi|arrest warrant|money laundering|customs).{0,25}/i,
    fallbackSnippet: "Fake police / digital arrest threat",
    explanation:
      "Indian Police, CBI, Customs, or Cyber Cell NEVER conduct 'digital arrests' over video calls or demand security deposits to clear your name.",
  },
  {
    id: "rf-job-fee",
    tactic: "Advance-Fee / Task Scam",
    severity: "HIGH",
    weight: 38,
    pattern:
      /(security deposit|registration fee|refundable.*fee|vip.*task|liking youtube|earn.*daily|prepaid task|double your)/i,
    snippetPattern:
      /.{0,25}(?:security deposit|refundable|vip.*task|liking youtube|earn.*daily|prepaid task).{0,25}/i,
    fallbackSnippet: "Upfront deposit for guaranteed daily earnings",
    explanation:
      "Real employers never ask you to pay a deposit to unlock salary or pay ₹3,500–₹8,000/day just for liking videos.",
  },
  {
    id: "rf-otp-kyc",
    tactic: "Credential / OTP Harvesting",
    severity: "HIGH",
    weight: 32,
    pattern: /(share.*otp|tell.*otp|send.*otp|cvv|atm pin|pan.*kyc|kyc.*update)/i,
    snippetPattern: /.{0,25}(?:otp|kyc|cvv|atm pin).{0,25}/i,
    fallbackSnippet: "OTP / KYC credential request",
    explanation:
      "Banks never ask for OTPs over calls/SMS or force PAN KYC updates via random shortened web links.",
  },
  {
    id: "rf-unsolicited-otp-link",
    tactic: "Unsolicited OTP & Phishing Link Bait",
    severity: "HIGH",
    weight: 62,
    pattern:
      /(?:your\s+(?:code|otp)\s+is\s+\d{4,8}|didn'?t\s+request\s+this|did\s+not\s+request\s+this)[\s\S]{0,120}(?:click\s+here|tap\s+here|verify\s+here|https?:\/\/)/i,
    snippetPattern:
      /(?:your\s+(?:code|otp)\s+is\s+\d{4,8}|if\s+you\s+didn'?t\s+request\s+this[\s\S]{0,40})/i,
    fallbackSnippet: "Unsolicited verification code with link",
    explanation:
      "Attackers send fake 'Your code is X. If you didn't request this, click here' alerts to lure you into clicking phishing or account-takeover links.",
  },
  {
    id: "rf-prize-lure",
    tactic: "Fake Cash Prize / Lottery Claim",
    severity: "HIGH",
    weight: 40,
    pattern:
      /(congratulations[\s\S]{0,50}?(?:won|prize|winner)|won[\s\S]{0,40}?(?:cash|prize|lottery|reward|bonus|rs\.?|₹|\$)|lucky draw|\blottery\b|gift[\s\S]{0,30}?claim|(?:click|tap)[\s\S]{0,35}?(?:this\s+)?link[\s\S]{0,35}?(?:to\s+)?claim)/i,
    snippetPattern:
      /.{0,25}(?:congratulations|won[\s\S]{0,20}(?:cash|prize)|lottery|lucky draw|claim)/i,
    fallbackSnippet: "Fake cash prize / claim link bait",
    explanation:
      "Unsolicited 'Congratulations you won a cash prize' messages with claim links are classic phishing traps designed to steal banking credentials or advance fees.",
  },
  {
    id: "rf-overpay",
    tactic: "Fake Overpayment / Bait Story",
    severity: "HIGH",
    weight: 26,
    pattern: /(accidentally sent|wrongly transferred)/i,
    snippetPattern: /.{0,25}(?:accidentally sent|wrongly transferred).{0,25}/i,
    fallbackSnippet: "Accidental transfer claim",
    explanation:
      "No real mistake occurred—the screenshot/SMS is fake, and they are trying to rush you into sending your own money back.",
  },
  {
    id: "rf-urgency",
    tactic: "Panic & Time-Pressure Trap",
    severity: "MEDIUM",
    weight: 22,
    pattern:
      /(immediately|urgent|within \d+ hours?|tonight|blocked|suspended|freeze|legal action|last warning|right now)/i,
    snippetPattern:
      /.{0,20}(?:blocked|suspended|within \d+ hours?|tonight|immediately|legal action|last warning).{0,20}/i,
    fallbackSnippet: "Urgent threat / countdown",
    explanation:
      "Scammers create fake countdowns ('blocked tonight', 'within 2 hours') so you panic and click before double-checking.",
  },
];
