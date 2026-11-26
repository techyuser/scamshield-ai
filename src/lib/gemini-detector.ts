import { GoogleGenAI } from "@google/genai";
import type { AnalyzeRequest, AnalyzeResult } from "@/types/scamshield";
import { getServerGeminiKey, sanitizeGeminiApiKey } from "./env";
import { runGeminiAnalysis } from "./gemini-core";

export { hasServerGeminiKey } from "./env";

function resolveServerClient(overrideKey?: string | null): GoogleGenAI | null {
  const key = sanitizeGeminiApiKey(overrideKey) || getServerGeminiKey();
  if (!key) return null;
  return new GoogleGenAI({ apiKey: key });
}

/**
 * Server-side Gemini scam detector using validated GEMINI_API_KEY or optional request override.
 */
export async function analyzeMessageWithGemini(
  req: AnalyzeRequest,
  overrideKey?: string | null
): Promise<AnalyzeResult> {
  const startedAt = Date.now();
  const client = resolveServerClient(overrideKey);
  return runGeminiAnalysis(client, req, startedAt);
}
