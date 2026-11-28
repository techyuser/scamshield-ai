"use client";

import { useEffect, useState } from "react";
import { Trash2, Info, Moon, Languages, HardDrive } from "lucide-react";
import { clearMobileHistory, loadMobileSettings, saveMobileSettings } from "@/lib/mobile-storage";

export function SettingsMobile() {
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [darkMode, setDarkMode] = useState(true);
  const [retentionDays, setRetentionDays] = useState(30);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    const saved = loadMobileSettings();
    setLanguage(saved.language);
    setRetentionDays(saved.retentionDays);
  }, []);

  const updateLanguage = (lang: "en" | "hi") => {
    setLanguage(lang);
    saveMobileSettings({ language: lang, retentionDays });
  };

  const updateRetention = (days: number) => {
    setRetentionDays(days);
    saveMobileSettings({ language, retentionDays: days });
  };

  const handleClearAll = () => {
    clearMobileHistory();
    setCleared(true);
    setTimeout(() => setCleared(false), 2500);
  };

  return (
    <div className="p-4 space-y-6 max-w-md mx-auto text-slate-100">
      <div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-xs text-slate-400">Preferences and privacy controls</p>
      </div>

      {/* Language */}
      <div className="p-4 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
            <Languages className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-200">Language</h3>
            <p className="text-xs text-slate-400">Select display language</p>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => updateLanguage("en")}
            className={`flex-1 py-2 rounded-xl text-xs font-medium ${language === "en" ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => updateLanguage("hi")}
            className={`flex-1 py-2 rounded-xl text-xs font-medium ${language === "hi" ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
          >
            हिंदी (Hindi)
          </button>
        </div>
      </div>

      {/* Privacy & Data */}
      <div className="p-4 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-200">Data Retention</h3>
            <p className="text-xs text-slate-400">How long to keep scan history</p>
          </div>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <input
            type="range"
            min="7"
            max="90"
            value={retentionDays}
            onChange={(e) => updateRetention(Number(e.target.value))}
            className="flex-1 h-2 bg-slate-800 rounded-full appearance-none accent-purple-500 cursor-pointer"
          />
          <span className="text-sm font-mono text-purple-400 whitespace-nowrap shrink-0 text-right">{retentionDays} days</span>
        </div>
      </div>

      {/* Appearance */}
      <div className="p-4 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
            <Moon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-200">Dark Mode</h3>
            <p className="text-xs text-slate-400">Always on for cybersecurity aesthetic</p>
          </div>
        </div>
        <label className="flex items-center justify-between pt-2 cursor-pointer">
          <span className="text-xs text-slate-300">Enabled (System locked)</span>
          <input
            type="checkbox"
            checked={darkMode}
            onChange={(e) => setDarkMode(e.target.checked)}
            disabled
            className="w-5 h-5 accent-purple-500 opacity-50"
          />
        </label>
      </div>

      {/* Danger Zone */}
      <div className="p-4 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 space-y-4">
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
          className="w-full py-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-medium hover:bg-rose-500/30 transition"
        >
          {cleared ? "History Cleared!" : "Delete Everything"}
        </button>
      </div>

      {/* About */}
      <div className="p-4 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">About ScamShield AI</h3>
            <p className="text-xs text-slate-400">Version 1.0.0 · Powered by Gemini AI</p>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 text-center">
          ScamShield AI helps protect you from digital fraud by analyzing messages
          for scam indicators. Your privacy is our priority — no data leaves your
          device without explicit consent.
        </p>
      </div>
    </div>
  );
}