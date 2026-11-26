import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { MAX_REQUEST_BODY_BYTES, RATE_LIMIT_MAX_REQUESTS } from "@/lib/constants";
import { analyzeMessageWithGemini, hasServerGeminiKey } from "@/lib/gemini-detector";
import {
  buildCacheKey,
  checkRateLimitStatus,
  getCachedAnalysis,
  sanitizeSessionApiKey,
  setCachedAnalysis,
  validateAnalyzePayload,
} from "@/lib/validation";

/**
 * POST /api/analyze — Enforces body caps and rate limiting, validates payload &
 * image binary headers, checks cache, and runs the 3-stage ScamShield pipeline.
 */
export async function POST(req: NextRequest) {
  let baseHeaders: Record<string, string> = { "Cache-Control": "no-store" };

  try {
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip")?.trim() ||
      "local-client";

    const rateStatus = checkRateLimitStatus(clientIp);
    baseHeaders = {
      "Cache-Control": "no-store",
      "X-RateLimit-Limit": String(RATE_LIMIT_MAX_REQUESTS),
      "X-RateLimit-Remaining": String(rateStatus.remaining),
    };

    if (!rateStatus.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment before scanning again." },
        {
          status: 429,
          headers: {
            ...baseHeaders,
            "Retry-After": String(rateStatus.resetInSeconds),
          },
        }
      );
    }

    const declaredLength = Number(req.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BODY_BYTES) {
      return NextResponse.json(
        { error: "Request body exceeds maximum allowed size of 4.5 MB." },
        { status: 413, headers: baseHeaders }
      );
    }

    const rawText = await req.text();
    if (Buffer.byteLength(rawText, "utf8") > MAX_REQUEST_BODY_BYTES) {
      return NextResponse.json(
        { error: "Request body exceeds maximum allowed size of 4.5 MB." },
        { status: 413, headers: baseHeaders }
      );
    }

    let rawBody: unknown;
    try {
      rawBody = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        { error: "Malformed JSON request body." },
        { status: 400, headers: baseHeaders }
      );
    }

    const validation = validateAnalyzePayload(rawBody);
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400, headers: baseHeaders }
      );
    }

    const overrideKey = sanitizeSessionApiKey(req.headers.get("x-gemini-key"));
    const hasLiveKey = Boolean(overrideKey || hasServerGeminiKey());
    const cacheKey = buildCacheKey(validation.data, hasLiveKey);
    const cached = getCachedAnalysis(cacheKey);
    if (cached) {
      return NextResponse.json(
        { ...cached, latencyMs: 12 },
        { headers: baseHeaders }
      );
    }

    const result = await analyzeMessageWithGemini(validation.data, overrideKey);
    setCachedAnalysis(cacheKey, result);
    return NextResponse.json(result, { headers: baseHeaders });
  } catch {
    return NextResponse.json(
      { error: "Failed to analyze message." },
      { status: 500, headers: baseHeaders }
    );
  }
}
