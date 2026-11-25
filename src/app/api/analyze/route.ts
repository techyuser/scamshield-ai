import { NextRequest, NextResponse } from "next/server";
import { analyzeMessageWithGemini, hasServerGeminiKey } from "@/lib/gemini-detector";
import {
  buildCacheKey,
  checkRateLimit,
  getCachedAnalysis,
  sanitizeSessionApiKey,
  setCachedAnalysis,
  validateAnalyzePayload,
} from "@/lib/validation";

/**
 * POST /api/analyze — Validates payload, applies rate limiting and TTL caching,
 * and returns a structured scam diagnostic report.
 */
export async function POST(req: NextRequest) {
  try {
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local-client";
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment before scanning again." },
        { status: 429, headers: { "Cache-Control": "no-store" } }
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Malformed JSON request body." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const validation = validateAnalyzePayload(rawBody);
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const overrideKey = sanitizeSessionApiKey(req.headers.get("x-gemini-key"));
    const hasLiveKey = Boolean(overrideKey || hasServerGeminiKey());
    const cacheKey = buildCacheKey(validation.data, hasLiveKey);
    const cached = getCachedAnalysis(cacheKey);
    if (cached) {
      return NextResponse.json(
        { ...cached, latencyMs: 12 },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const result = await analyzeMessageWithGemini(validation.data, overrideKey);
    setCachedAnalysis(cacheKey, result);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { error: "Failed to analyze message." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
