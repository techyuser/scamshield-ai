import type { MessageChannel, ScamVerdict } from "@/types/scamshield";

export const GEMINI_MODEL_ID = "gemini-3.5-flash-lite" as const;
export const GEMINI_TIMEOUT_MS = 8500;
export const ANDROID_BETA_APK_URL =
  "https://github.com/techyuser/scamshield-ai/releases/download/v0.1.0-dev.1/scamshield-ai-v0.1.0-dev-debug.apk" as const;

export const ALLOWED_CHANNELS: readonly MessageChannel[] = [
  "whatsapp",
  "sms",
  "email",
  "job_offer",
  "upi",
];

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export const MIN_MESSAGE_LENGTH = 5;
export const MAX_MESSAGE_LENGTH = 3000;
export const MAX_RAW_MESSAGE_CHARS = 25000;
export const MAX_SENDER_LENGTH = 120;
export const MAX_IMAGE_FILE_BYTES = 3 * 1024 * 1024;
export const MAX_IMAGE_BASE64_BYTES = 4 * 1024 * 1024;
export const MAX_REQUEST_BODY_BYTES = 4.5 * 1024 * 1024;
export const MAX_API_KEY_LENGTH = 128;

export const RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const RATE_LIMIT_MAX_REQUESTS = 40;
export const CACHE_TTL_MS = 10 * 60 * 1000;
export const MAX_CACHE_ENTRIES = 200;

export const RISK_THRESHOLDS = {
  CRITICAL: 65,
  SUSPICIOUS: 26,
  PROMPT_INJECTION_FLOOR: 85,
  MIN_SCORE: 4,
  MAX_SCORE: 99,
} as const;

export const VALID_VERDICTS = new Set<ScamVerdict>([
  "CRITICAL_SCAM",
  "SUSPICIOUS",
  "LOOKS_SAFE",
]);
