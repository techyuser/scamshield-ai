import { createHash } from "node:crypto";
import { AnalyzeRequest, AnalyzeResult, MessageChannel, ReplyLanguage } from "@/types/scamshield";

const VALID_CHANNELS = new Set<MessageChannel>(["whatsapp", "sms", "email", "job_offer", "upi"]);
const VALID_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_IMAGE_BASE64_BYTES = 4 * 1024 * 1024;

interface RateEntry {
  count: number;
  resetAt: number;
}

interface CacheEntry {
  result: AnalyzeResult;
  expiresAt: number;
}

const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_REQUESTS = 40;
const CACHE_TTL_MS = 10 * 60 * 1000;

const rateLimitStore = new Map<string, RateEntry>();
const analysisCache = new Map<string, CacheEntry>();

export function validateAnalyzePayload(raw: unknown):
  | { ok: true; data: AnalyzeRequest }
  | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Invalid JSON payload." };
  }

  const body = raw as Partial<AnalyzeRequest>;
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64.trim() : "";
  const imageMimeType = typeof body.imageMimeType === "string" ? body.imageMimeType.trim() : "";

  if (!imageBase64 && message.length < 5) {
    return { ok: false, error: "Please paste at least 5 characters or attach a screenshot." };
  }

  if (imageBase64) {
    if (!VALID_MIME_TYPES.has(imageMimeType)) {
      return { ok: false, error: "Unsupported screenshot format. Use PNG, JPEG, or WebP." };
    }
    if (imageBase64.length > MAX_IMAGE_BASE64_BYTES) {
      return { ok: false, error: "Screenshot exceeds 3MB upload limit." };
    }
  }

  const channel: MessageChannel =
    body.channel && VALID_CHANNELS.has(body.channel) ? body.channel : "whatsapp";
  const language: ReplyLanguage = body.language === "hi" ? "hi" : "en";

  return {
    ok: true,
    data: {
      message: message.slice(0, 3000) || "Screenshot uploaded for fraud inspection.",
      channel,
      senderInfo: typeof body.senderInfo === "string" ? body.senderInfo.slice(0, 120) : "",
      language,
      imageBase64: imageBase64 || undefined,
      imageMimeType: imageMimeType || undefined,
    },
  };
}

export function checkRateLimit(clientKey: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(clientKey);
  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(clientKey, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_MAX_REQUESTS) {
    return false;
  }
  entry.count += 1;
  return true;
}

export function buildCacheKey(req: AnalyzeRequest, hasLiveKey: boolean): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        message: req.message,
        channel: req.channel,
        senderInfo: req.senderInfo,
        language: req.language,
        imageDigest: req.imageBase64 ? req.imageBase64.slice(0, 128) : "",
        hasLiveKey,
      })
    )
    .digest("hex");
}

export function getCachedAnalysis(key: string): AnalyzeResult | null {
  const entry = analysisCache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.result;
  }
  if (entry) analysisCache.delete(key);
  return null;
}

export function setCachedAnalysis(key: string, result: AnalyzeResult): void {
  if (analysisCache.size > 200) {
    const oldestKey = analysisCache.keys().next().value;
    if (oldestKey) analysisCache.delete(oldestKey);
  }
  analysisCache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
}
