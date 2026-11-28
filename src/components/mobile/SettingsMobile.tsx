"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { Trash2, Info, Languages, HardDrive, KeyRound, SlidersHorizontal, Smartphone, SunMoon } from "lucide-react";
import {
  clearMobileHistory,
  loadMobileGeminiKey,
  loadMobileSettings,
  saveMobileGeminiKey,
  saveMobileSettings,
} from "@/lib/mobile-storage";
import { applyAppTheme, type AppThemeMode } from "@/lib/theme";
import { ScamShieldBridge } from "@/plugins/scamshield-bridge";

const APP_FILTERS = [
  { id: "all", label: "All Apps" },
  { id: "com.whatsapp", label: "WhatsApp" },
  { id: "com.google.android.apps.messaging", label: "Google SMS" },
  { id: "com.samsung.android.messaging", label: "Samsung SMS" },
  { id: "org.telegram.messenger", label: "Telegram" },
  { id: "com.google.android.gm", label: "Gmail" },
];

export function SettingsMobile() {
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [retentionDays, setRetentionDays] = useState(30);
  const [alertThreshold, setAlertThreshold] = useState<26 | 51 | 70>(26);
  const [monitoredApps, setMonitoredApps] = useState<string[]>(["all"]);
  const [theme, setTheme] = useState<AppThemeMode>("dark");
  const [geminiKey, setGeminiKey] = useState("");
  const [keySaved, setKeySaved] = useState(false);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    const saved = loadMobileSettings();
    setLanguage(saved.language);
    setRetentionDays(saved.retentionDays);
    setAlertThreshold(saved.alertThreshold);
    setMonitoredApps(saved.monitoredApps);
    setTheme(saved.theme);
    setGeminiKey(loadMobileGeminiKey());
  }, []);

  const persistAndSync = (next: {
    language?: "en" | "hi";
    retentionDays?: number;
    alertThreshold?: 26 | 51 | 70;
    monitoredApps?: string[];
    theme?: AppThemeMode;
  }) => {
    const full = {
      language: next.language ?? language,
      retentionDays: next.retentionDays ?? retentionDays,
      alertThreshold: next.alertThreshold ?? alertThreshold,
      monitoredApps: next.monitoredApps ?? monitoredApps,
      theme: next.theme ?? theme,
    };
    saveMobileSettings(full);
    void ScamShieldBridge.setShieldConfig({
      threshold: full.alertThreshold,
      monitoredApps: full.monitoredApps.includes("all") ? "all" : full.monitoredApps.join(","),
    }).catch(() => {});
  };

  const toggleMonitoredApp = (id: string) => {
    let next: string[];
    if (id === "all") {
      next = ["all"];
    } else {
      const withoutAll = monitoredApps.filter((a) => a !== "all");
      next = withoutAll.includes(id) ? withoutAll.filter((a) => a !== id) : [...withoutAll, id];
      if (next.length === 0) next = ["all"];
    }
    setMonitoredApps(next);
    persistAndSync({ monitoredApps: next });
  };

  const handleSaveGeminiKey = () => {
    saveMobileGeminiKey(geminiKey);
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  };

  const handleClearAll = async () => {
    clearMobileHistory();
    await ScamShieldBridge.clearShieldData().catch(() => {});
    setCleared(true);
    setTimeout(() => setCleared(false), 2500);
  };

  return (
    <div className="p-4 space-y-5 max-w-md mx-auto text-slate-100">
      <div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-xs text-slate-400">Appearance, detection rules, app filters, and privacy</p>
      </div>

      {/* Appearance (Light / Dark / System) */}
      <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800/80 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
            <SunMoon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-200">Appearance</h3>
            <p className="text-xs text-slate-400">Switch between Dark, Light, or System theme</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-1">
          {[
            { id: "dark" as const, label: "Dark" },
            { id: "light" as const, label: "Light" },
            { id: "system" as const, label: "System" },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                applyAppTheme(opt.id, {
                  animate: true,
                  onBeforeCommit: () => flushSync(() => setTheme(opt.id)),
                  onAfterTransition: () => persistAndSync({ theme: opt.id }),
                });
              }}
              className={`py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                theme === opt.id
                  ? "bg-purple-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alert Sensitivity */}
      <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800/80 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-200">Notification Sensitivity</h3>
            <p className="text-xs text-slate-400">Minimum risk score to trigger push alerts</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              setAlertThreshold(26);
              persistAndSync({ alertThreshold: 26 });
            }}
            className={`py-2.5 px-2 rounded-xl text-xs font-medium transition-colors ${
              alertThreshold === 26
                ? "bg-purple-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            Sensitive (&gt;25%)
          </button>
          <button
            type="button"
            onClick={() => {
              setAlertThreshold(51);
              persistAndSync({ alertThreshold: 51 });
            }}
            className={`py-2.5 px-2 rounded-xl text-xs font-medium transition-colors ${
              alertThreshold === 51
                ? "bg-purple-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            Balanced (&gt;50%)
          </button>
          <button
            type="button"
            onClick={() => {
              setAlertThreshold(70);
              persistAndSync({ alertThreshold: 70 });
            }}
            className={`py-2.5 px-2 rounded-xl text-xs font-medium transition-colors ${
              alertThreshold === 70
                ? "bg-rose-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            Critical (70%+)
          </button>
        </div>
      </div>

      {/* Monitored Apps */}
      <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800/80 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-200">Monitored Apps</h3>
            <p className="text-xs text-slate-400">Choose which apps Notification Shield inspects</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {APP_FILTERS.map((app) => {
            const active = monitoredApps.includes(app.id);
            return (
              <button
                key={app.id}
                type="button"
                onClick={() => toggleMonitoredApp(app.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  active
                    ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-200"
                    : "bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {app.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Language */}
      <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800/80 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
            <Languages className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-200">Report Language</h3>
            <p className="text-xs text-slate-400">Language for guidance &amp; safe replies</p>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              setLanguage("en");
              persistAndSync({ language: "en" });
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-medium ${
              language === "en" ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => {
              setLanguage("hi");
              persistAndSync({ language: "hi" });
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-medium ${
              language === "hi" ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            हिंदी (Hindi)
          </button>
        </div>
      </div>

      {/* Data Retention */}
      <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800/80 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-200">Data Retention</h3>
            <p className="text-xs text-slate-400">How long to keep scan history</p>
          </div>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <input
            type="range"
            min="7"
            max="90"
            value={retentionDays}
            onChange={(e) => {
              const days = Number(e.target.value);
              setRetentionDays(days);
              persistAndSync({ retentionDays: days });
            }}
            className="flex-1 h-2 bg-slate-800 rounded-full appearance-none accent-purple-500 cursor-pointer"
          />
          <span className="text-sm font-mono text-purple-400 whitespace-nowrap shrink-0 text-right">
            {retentionDays} days
          </span>
        </div>
      </div>

      {/* Optional Gemini Key */}
      <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800/80 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
            <KeyRound className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-200">Gemini AI Key (Optional)</h3>
            <p className="text-xs text-slate-400">Enhances screenshot QR &amp; visual scam detection</p>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            type="password"
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            placeholder="AIza... (optional)"
            className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
          />
          <button
            type="button"
            onClick={handleSaveGeminiKey}
            className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold whitespace-nowrap shrink-0"
          >
            {keySaved ? "Saved!" : "Save"}
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800/80 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
            <Trash2 className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-200">Clear All History</h3>
            <p className="text-xs text-slate-400">Permanently delete scan and alert logs</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClearAll}
          className="w-full py-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-medium hover:bg-rose-500/30 transition"
        >
          {cleared ? "History Cleared!" : "Delete Everything"}
        </button>
      </div>

      {/* About */}
      <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800/80 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">About ScamShield AI</h3>
            <p className="text-xs text-slate-400">Version 1.0.0 · On-Device OCR + AI</p>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 text-center">
          ScamShield AI inspects messages and screenshots locally using deterministic fraud rules and ML Kit OCR. Your privacy stays on your device.
        </p>
      </div>
    </div>
  );
}
