import { NextRequest, NextResponse } from "next/server";
import { analyzeMessageWithGemini, hasServerGeminiKey } from "@/lib/gemini-detector";
import {
  buildCacheKey,
  checkRateLimit,
  getCachedAnalysis,
  setCachedAnalysis,
  validateAnalyzePayload,
} from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local-client";
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment before scanning again." },
        { status: 429 }
      );
    }

    const rawBody: unknown = await req.json();
    const validation = validateAnalyzePayload(rawBody);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const overrideKey = req.headers.get("x-gemini-key");
    const hasLiveKey = Boolean(overrideKey?.trim() || hasServerGeminiKey());
    const cacheKey = buildCacheKey(validation.data, hasLiveKey);
    const cached = getCachedAnalysis(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached, latencyMs: 12 });
    }

    const result = await analyzeMessageWithGemini(validation.data, overrideKey);
    setCachedAnalysis(cacheKey, result);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to analyze message." }, { status: 500 });
  }
}
