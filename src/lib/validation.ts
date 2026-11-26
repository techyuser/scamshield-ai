import { createHash } from "node:crypto";
import type {
  AnalyzeRequest,
  AnalyzeResult,
  MessageChannel,
  ReplyLanguage,
} from "@/types/scamshield";
import {
  ALLOWED_CHANNELS,
  ALLOWED_IMAGE_MIME_TYPES,
  CACHE_TTL_MS,
  MAX_CACHE_ENTRIES,
  MAX_IMAGE_BASE64_BYTES,
  MAX_MESSAGE_LENGTH,
  MAX_RAW_MESSAGE_CHARS,
  MAX_SENDER_LENGTH,
  MIN_MESSAGE_LENGTH,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
  type AllowedImageMimeType,
} from "./constants";
import { sanitizeGeminiApiKey } from "./env";

const VALID_CHANNELS = new Set<MessageChannel>(ALLOWED_CHANNELS);
const VALID_MIME_TYPES = new Set<string>(ALLOWED_IMAGE_MIME_TYPES);

interface RateEntry {
  count: number;
  resetAt: number;
}

interface CacheEntry {
  result: AnalyzeResult;
  expiresAt: number;
}

const rateLimitStore = new Map<string, RateEntry>();
const analysisCache = new Map<string, CacheEntry>();

export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Verifies decoded leading bytes match the claimed PNG, JPEG, or WebP MIME header
 * to reject spoofed binary attachments before forwarding to the model.
 */
export function hasValidImageSignature(
  base64: string,
  mimeType: AllowedImageMimeType
): boolean {
  try {
    const prefix = Buffer.from(base64.slice(0, 24), "base64");
    if (prefix.length < 4) return false;
    if (mimeType === "image/png") {
      return prefix[0] === 0x89 && prefix[1] === 0x50 && prefix[2] === 0x4e && prefix[3] === 0x47;
    }
    if (mimeType === "image/jpeg") {
      return prefix[0] === 0xff && prefix[1] === 0xd8 && prefix[2] === 0xff;
    }
    if (mimeType === "image/webp") {
      return (
        prefix.length >= 12 &&
        prefix.subarray(0, 4).toString("ascii") === "RIFF" &&
        prefix.subarray(8, 12).toString("ascii") === "WEBP"
      );
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Validates and sanitizes an incoming message or screenshot scan request.
 */
export function validateAnalyzePayload(raw: unknown):
  | { ok: true; data: AnalyzeRequest }
  | { ok: false; error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Invalid JSON payload." };
  }

  if (
    Object.hasOwn(raw, "__proto__") ||
    Object.hasOwn(raw, "constructor") ||
    Object.hasOwn(raw, "prototype")
  ) {
    return { ok: false, error: "Disallowed property key in payload." };
  }

  const body = raw as Partial<AnalyzeRequest>;
  if (body.message !== undefined && typeof body.message !== "string") {
    return { ok: false, error: "Field 'message' must be a string." };
  }
  if (body.senderInfo !== undefined && typeof body.senderInfo !== "string") {
    return { ok: false, error: "Field 'senderInfo' must be a string." };
  }

  const rawMessage = typeof body.message === "string" ? body.message.trim() : "";
  if (rawMessage.length > MAX_RAW_MESSAGE_CHARS) {
    return {
      ok: false,
      error: `Message exceeds maximum allowed length of ${MAX_RAW_MESSAGE_CHARS} characters.`,
    };
  }

  const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64.trim() : "";
  const imageMimeType = typeof body.imageMimeType === "string" ? body.imageMimeType.trim() : "";

  if (!imageBase64 && rawMessage.length < MIN_MESSAGE_LENGTH) {
    return {
      ok: false,
      error: `Please paste at least ${MIN_MESSAGE_LENGTH} characters or attach a screenshot.`,
    };
  }

  if (imageBase64) {
    if (!VALID_MIME_TYPES.has(imageMimeType)) {
      return { ok: false, error: "Unsupported screenshot format. Use PNG, JPEG, or WebP." };
    }
    if (imageBase64.length > MAX_IMAGE_BASE64_BYTES) {
      return { ok: false, error: "Screenshot exceeds 3MB upload limit." };
    }
    if (!/^[A-Za-z0-9+/=]+$/.test(imageBase64)) {
      return { ok: false, error: "Invalid base64 screenshot encoding." };
    }
    if (!hasValidImageSignature(imageBase64, imageMimeType as AllowedImageMimeType)) {
      return {
        ok: false,
        error: "Screenshot bytes do not match declared PNG, JPEG, or WebP format.",
      };
    }
  }

  if (body.channel !== undefined) {
    if (typeof body.channel !== "string" || !VALID_CHANNELS.has(body.channel as MessageChannel)) {
      return {
        ok: false,
        error: "Unsupported message channel. Use whatsapp, sms, email, job_offer, or upi.",
      };
    }
  }
  const channel: MessageChannel = (body.channel as MessageChannel | undefined) ?? "whatsapp";

  if (body.language !== undefined && body.language !== "en" && body.language !== "hi") {
    return { ok: false, error: "Unsupported output language. Use 'en' or 'hi'." };
  }
  const language: ReplyLanguage = body.language === "hi" ? "hi" : "en";

  return {
    ok: true,
    data: {
      message: rawMessage.slice(0, MAX_MESSAGE_LENGTH) || "Screenshot uploaded for fraud inspection.",
      channel,
      senderInfo: typeof body.senderInfo === "string" ? body.senderInfo.slice(0, MAX_SENDER_LENGTH).trim() : "",
      language,
      imageBase64: imageBase64 || undefined,
      imageMimeType: imageMimeType || undefined,
    },
  };
}

/**
 * Re-export key sanitizer so callers importing from validation keep full compatibility.
 */
export function sanitizeSessionApiKey(rawKey: string | null): string | null {
  return sanitizeGeminiApiKey(rawKey);
}

/**
 * Checks per-client sliding-window quota and returns remaining headroom + Retry-After window.
 * Note: Stored in instance memory; serverless workers do not share quota across cold instances.
 */
export function checkRateLimitStatus(
  clientKey: string,
  now = Date.now(),
  maxRequests = RATE_LIMIT_MAX_REQUESTS
): RateLimitStatus {
  if (rateLimitStore.size > 500) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt <= now) rateLimitStore.delete(k);
    }
  }

  const entry = rateLimitStore.get(clientKey);
  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(clientKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - 1),
      resetInSeconds: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
    };
  }

  const resetInSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetInSeconds };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - entry.count),
    resetInSeconds,
  };
}

/**
 * Clears rate limit buckets (intended strictly for deterministic automated tests).
 */
export function resetRateLimitStoreForTests(): void {
  rateLimitStore.clear();
}

/**
 * Computes a collision-resistant SHA-256 cache key scoped by message, channel, language, and mode.
 */
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

/**
 * Retrieves a non-expired cached scan result if available.
 */
export function getCachedAnalysis(key: string, now = Date.now()): AnalyzeResult | null {
  const entry = analysisCache.get(key);
  if (entry && entry.expiresAt > now) {
    return entry.result;
  }
  if (entry) analysisCache.delete(key);
  return null;
}

/**
 * Stores a scan result in the bounded in-memory TTL cache with FIFO eviction.
 */
export function setCachedAnalysis(
  key: string,
  result: AnalyzeResult,
  now = Date.now()
): void {
  if (analysisCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = analysisCache.keys().next().value;
    if (oldestKey) analysisCache.delete(oldestKey);
  }
  analysisCache.set(key, { result, expiresAt: now + CACHE_TTL_MS });
}

/**
 * Clears in-memory scan cache entries (intended strictly for deterministic automated tests).
 */
export function resetAnalysisCacheForTests(): void {
  analysisCache.clear();
}
