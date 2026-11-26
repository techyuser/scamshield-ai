"use client";

import { GoogleGenAI } from "@google/genai";
import type { AnalyzeRequest, AnalyzeResult } from "@/types/scamshield";
import { sanitizeGeminiApiKey } from "./env";
import { runGeminiAnalysis } from "./gemini-core";
import { analyzeMessageDeterministic } from "./heuristic-detector";

/**
 * Client-side analyzer used automatically on static hosts (like Netlify Drop)
 * or offline mode where Next.js API routes are unavailable.
 */
export async function analyzeClientFallback(
  req: AnalyzeRequest,
  sessionKey?: string
): Promise<AnalyzeResult> {
  const startedAt = Date.now();
  const validKey = sanitizeGeminiApiKey(sessionKey);
  if (validKey) {
    const client = new GoogleGenAI({ apiKey: validKey });
    return runGeminiAnalysis(client, req, startedAt);
  }
  return analyzeMessageDeterministic(req, startedAt);
}
