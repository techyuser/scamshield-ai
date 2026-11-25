"use client";

import { GoogleGenAI } from "@google/genai";
import { AnalyzeRequest, AnalyzeResult } from "@/types/scamshield";
import { runGeminiAnalysis } from "./gemini-core";
import { analyzeMessageDeterministic } from "./heuristic-detector";

/**
 * Client-side analyzer used automatically on static hosts (like Netlify Drop)
 * where Next.js API routes are not present.
 */
export async function analyzeClientFallback(
  req: AnalyzeRequest,
  sessionKey?: string
): Promise<AnalyzeResult> {
  const trimmed = sessionKey?.trim();
  if (trimmed) {
    const client = new GoogleGenAI({ apiKey: trimmed });
    return runGeminiAnalysis(client, req, Date.now());
  }
  return analyzeMessageDeterministic(req, Date.now());
}
