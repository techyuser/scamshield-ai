"use client";

export interface MobileHistoryEntry {
  id: string;
  riskScore: number;
  preview: string;
  source: string;
  timestamp: number;
}

const HISTORY_KEY = "scamshield_mobile_history_v1";
const SETTINGS_KEY = "scamshield_mobile_settings_v1";

export interface MobileSettings {
  language: "en" | "hi";
  retentionDays: number;
}

const DEFAULT_SETTINGS: MobileSettings = {
  language: "en",
  retentionDays: 30,
};

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
    return {
      language: parsed.language === "hi" ? "hi" : "en",
      retentionDays:
        typeof parsed.retentionDays === "number" && parsed.retentionDays >= 7 && parsed.retentionDays <= 90
          ? parsed.retentionDays
          : 30,
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
