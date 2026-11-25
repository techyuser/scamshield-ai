import { GoogleGenAI } from "@google/genai";
import { AnalyzeRequest, AnalyzeResult } from "@/types/scamshield";
import { runGeminiAnalysis } from "./gemini-core";

function resolveServerClient(overrideKey?: string | null): GoogleGenAI | null {
  const rawKey = overrideKey?.trim() || process.env.GEMINI_API_KEY?.trim();
  if (!rawKey) return null;
  return new GoogleGenAI({ apiKey: rawKey });
}

export function hasServerGeminiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

/**
 * Server-side Gemini scam detector using GEMINI_API_KEY or optional request override.
 */
export async function analyzeMessageWithGemini(
  req: AnalyzeRequest,
  overrideKey?: string | null
): Promise<AnalyzeResult> {
  const startedAt = Date.now();
  const client = resolveServerClient(overrideKey);
  return runGeminiAnalysis(client, req, startedAt);
}
