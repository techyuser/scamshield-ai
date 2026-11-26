export type MessageChannel = "whatsapp" | "sms" | "email" | "job_offer" | "upi";
export type ScamVerdict = "CRITICAL_SCAM" | "SUSPICIOUS" | "LOOKS_SAFE";
export type ReplyLanguage = "en" | "hi";
export type AnalysisEngine = "gemini-3.5-flash-lite" | "deterministic-fallback";

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
  domains: string[];
  moneyMentions: string[];
  phoneNumbers: string[];
  urgencyPhrases: string[];
}

export interface TacticScores {
  urgencyPressure: number;
  financialTrap: number;
  impersonationRisk: number;
  linkDeception: number;
}

export interface AnalyzeResult {
  engine: AnalysisEngine;
  latencyMs: number;
  language: ReplyLanguage;
  promptInjectionBlocked: boolean;
  verdict: ScamVerdict;
  riskScore: number;
  scamCategory: string;
  headline: string;
  plainEnglishSummary: string;
  tacticScores: TacticScores;
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
