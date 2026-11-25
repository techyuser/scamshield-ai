export type MessageChannel = "whatsapp" | "sms" | "email" | "job_offer" | "upi";
export type ScamVerdict = "CRITICAL_SCAM" | "SUSPICIOUS" | "LOOKS_SAFE";
export type ReplyLanguage = "en" | "hi";

export interface AnalyzeRequest {
  message: string;
  channel: MessageChannel;
  senderInfo?: string;
  language?: ReplyLanguage;
  imageBase64?: string;
  imageMimeType?: string;
}

export interface RedFlagItem {
  id: string;
  tactic: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  matchedSnippet: string;
  explanation: string;
}

export interface PipelineStepTrace {
  stage: string;
  summary: string;
  status: "ALERT" | "WARN" | "CLEAR";
}

export interface ExtractedIndicators {
  urls: string[];
  moneyMentions: string[];
  phoneNumbers: string[];
  urgencyPhrases: string[];
}

export interface AnalyzeResult {
  engine: "gemini-3.5-flash-lite" | "deterministic-fallback";
  latencyMs: number;
  language: ReplyLanguage;
  promptInjectionBlocked: boolean;
  verdict: ScamVerdict;
  riskScore: number;
  scamCategory: string;
  headline: string;
  plainEnglishSummary: string;
  tacticScores: {
    urgencyPressure: number;
    financialTrap: number;
    impersonationRisk: number;
    linkDeception: number;
  };
  redFlags: RedFlagItem[];
  indicators: ExtractedIndicators;
  highlightedTerms: string[];
  pipelineTrace: PipelineStepTrace[];
  doNotDo: string[];
  safeNextSteps: string[];
  safeReplyDraft: string;
}

export interface DemoCase {
  id: string;
  label: string;
  tag: string;
  channel: MessageChannel;
  senderInfo: string;
  message: string;
}

export interface ScanHistoryItem {
  id: string;
  label: string;
  channel: MessageChannel;
  senderInfo: string;
  message: string;
  result: AnalyzeResult;
}
