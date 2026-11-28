"use client";

export interface AppDisplayInfo {
  label: string;
  badgeClass: string;
}

const APP_MAP: Record<string, AppDisplayInfo> = {
  "com.whatsapp": {
    label: "WhatsApp",
    badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  "com.whatsapp.w4b": {
    label: "WhatsApp Business",
    badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  "com.google.android.apps.messaging": {
    label: "Messages (SMS)",
    badgeClass: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  },
  "com.samsung.android.messaging": {
    label: "Samsung Messages",
    badgeClass: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  },
  "org.telegram.messenger": {
    label: "Telegram",
    badgeClass: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  },
  "com.google.android.gm": {
    label: "Gmail",
    badgeClass: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  },
  "com.instagram.android": {
    label: "Instagram",
    badgeClass: "bg-pink-500/15 text-pink-300 border-pink-500/30",
  },
};

export function getFriendlyAppInfo(packageOrSource: string): AppDisplayInfo {
  const clean = packageOrSource.replace(/\s*\(Notification Shield\)$/i, "").trim();
  if (APP_MAP[clean]) return APP_MAP[clean];
  if (clean.includes("Manual Scanner")) {
    return {
      label: "Manual Scanner",
      badgeClass: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    };
  }
  const short = clean.split(".").pop() || clean;
  return {
    label: short.charAt(0).toUpperCase() + short.slice(1),
    badgeClass: "bg-slate-700/40 text-slate-300 border-slate-600/40",
  };
}
