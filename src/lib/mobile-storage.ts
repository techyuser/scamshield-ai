"use client";

export interface MobileHistoryEntry {
  id: string;
  riskScore: number;
  preview: string;
  source: string;
  timestamp: number;
  category?: string;
}

const HISTORY_KEY = "scamshield_mobile_history_v1";
const SETTINGS_KEY = "scamshield_mobile_settings_v1";
const GEMINI_KEY_STORAGE = "scamshield_mobile_gemini_key_v1";

export interface MobileSettings {
  language: "en" | "hi";
  retentionDays: number;
  alertThreshold: 26 | 51 | 70;
  monitoredApps: string[];
  theme: "dark" | "light" | "system";
}

const DEFAULT_SETTINGS: MobileSettings = {
  language: "en",
  retentionDays: 30,
  alertThreshold: 26,
  monitoredApps: ["all"],
  theme: "dark",
};

const THRESHOLD_MIGRATION_KEY = "scamshield_threshold_v26_migrated";

export function loadMobileHistory(): MobileHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendMobileHistory(entry: Omit<MobileHistoryEntry, "id">): MobileHistoryEntry[] {
  const current = loadMobileHistory();
  const next: MobileHistoryEntry[] = [
    { ...entry, id: `${entry.timestamp}-${Math.random().toString(36).slice(2, 6)}` },
    ...current,
  ].slice(0, 50);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {
      // ignore storage quota errors
    }
  }
  return next;
}

export function clearMobileHistory(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(HISTORY_KEY);
  } catch {
    // ignore
  }
}

export function loadMobileSettings(): MobileSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<MobileSettings>;
    const migrated = window.localStorage.getItem(THRESHOLD_MIGRATION_KEY) === "1";
    let threshold: 26 | 51 | 70 =
      parsed.alertThreshold === 70 ? 70 : parsed.alertThreshold === 51 ? 51 : 26;
    if (!migrated && threshold === 51) {
      threshold = 26;
      window.localStorage.setItem(THRESHOLD_MIGRATION_KEY, "1");
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...parsed, alertThreshold: 26 }));
    } else if (!migrated) {
      window.localStorage.setItem(THRESHOLD_MIGRATION_KEY, "1");
    }
    return {
      language: parsed.language === "hi" ? "hi" : "en",
      retentionDays:
        typeof parsed.retentionDays === "number" && parsed.retentionDays >= 7 && parsed.retentionDays <= 90
          ? parsed.retentionDays
          : 30,
      alertThreshold: threshold,
      monitoredApps:
        Array.isArray(parsed.monitoredApps) && parsed.monitoredApps.length > 0
          ? parsed.monitoredApps
          : ["all"],
      theme:
        parsed.theme === "light" || parsed.theme === "system" ? parsed.theme : "dark",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveMobileSettings(settings: MobileSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function loadMobileGeminiKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(GEMINI_KEY_STORAGE) || "";
  } catch {
    return "";
  }
}

export function saveMobileGeminiKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = key.trim();
    if (trimmed) window.localStorage.setItem(GEMINI_KEY_STORAGE, trimmed);
    else window.localStorage.removeItem(GEMINI_KEY_STORAGE);
  } catch {
    // ignore
  }
}
