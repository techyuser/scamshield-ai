import { MAX_API_KEY_LENGTH } from "./constants";

/**
 * Validates optional user-supplied or environment Gemini keys safely without leaking secrets.
 */
export function sanitizeGeminiApiKey(rawKey?: string | null): string | null {
  if (!rawKey) return null;
  const trimmed = rawKey.trim();
  if (!trimmed || trimmed.length > MAX_API_KEY_LENGTH || !/^[A-Za-z0-9_.-]+$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

/**
 * Reads the server-side GEMINI_API_KEY if present and valid. Never returns secrets to clients.
 */
export function getServerGeminiKey(): string | null {
  const rawKey = typeof process !== "undefined" ? process.env?.GEMINI_API_KEY : undefined;
  return sanitizeGeminiApiKey(rawKey);
}

/**
 * Indicates whether a server-side Gemini API key is configured.
 */
export function hasServerGeminiKey(): boolean {
  return Boolean(getServerGeminiKey());
}
