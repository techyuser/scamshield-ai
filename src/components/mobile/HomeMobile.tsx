"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { Shield, ShieldAlert, Sparkles, Smartphone, History, PhoneCall, Zap, Activity, Sun, Moon } from "lucide-react";
import { ScamShieldBridge } from "@/plugins/scamshield-bridge";
import { loadMobileSettings, saveMobileSettings } from "@/lib/mobile-storage";
import { applyAppTheme, resolveIsLightTheme } from "@/lib/theme";
import { DEMO_CASES } from "@/lib/scenarios";
import type { DemoCase } from "@/types/scamshield";

interface HomeMobileProps {
  onNavigate: (tab: "home" | "scanner" | "notification-shield" | "history" | "settings") => void;
  onQuickScan?: (demo: DemoCase) => void;
  isActive?: boolean;
}

export function HomeMobile({ onNavigate, onQuickScan, isActive = true }: HomeMobileProps) {
  const [shieldActive, setShieldActive] = useState(false);
  const [inspectedCount, setInspectedCount] = useState(0);
  const [scamsBlocked, setScamsBlocked] = useState(0);
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    if (!isActive) return;
    setIsLight(resolveIsLightTheme(loadMobileSettings().theme));
    const refresh = () => {
      ScamShieldBridge.getNotificationStatus()
        .then((s) => setShieldActive(s.enabled && s.monitoring))
        .catch(() => { });
      ScamShieldBridge.getShieldData()
        .then((d) => {
          setInspectedCount(d.inspectedCount);
          setScamsBlocked(d.scamsDetected);
        })
        .catch(() => { });
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [isActive]);

  const handleToggleQuickTheme = () => {
    const nextMode = isLight ? "dark" : "light";
    applyAppTheme(nextMode, {
      animate: true,
      onBeforeCommit: () => flushSync(() => setIsLight(!isLight)),
      onAfterTransition: () => {
        const saved = loadMobileSettings();
        saveMobileSettings({ ...saved, theme: nextMode });
      },
    });
  };

  const quickPresets = DEMO_CASES.slice(0, 4);

  return (
    <div className="p-4 space-y-5 max-w-md mx-auto text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="brand-icon-badge w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-900/40">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-white whitespace-nowrap">ScamShield AI</h1>
            <p className="text-[11px] text-slate-400 truncate">Personal Scam Guard</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleToggleQuickTheme}
            aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
            className="w-8 h-8 rounded-full bg-slate-900/90 border border-slate-800/80 flex items-center justify-center text-slate-300 active:scale-95 transition-transform"
          >
            {isLight ? <Moon className="w-4 h-4 text-purple-400" /> : <Sun className="w-4 h-4 text-amber-300" />}
          </button>
          <span
            className={`whitespace-nowrap px-2.5 py-1 rounded-full border text-[10px] font-semibold ${shieldActive
              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
              : "bg-purple-500/20 text-purple-300 border-purple-500/30"
              }`}
          >
            {shieldActive ? "Active Shield" : "Shield Ready"}
          </span>
        </div>
      </div>

      {/* Protection Status & Live Telemetry Card */}
      <div className="home-hero-card p-5 rounded-3xl bg-gradient-to-br from-purple-900/35 via-slate-900/95 to-slate-900/95 border border-purple-500/25 shadow-2xl space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shield className={`w-5 h-5 ${shieldActive ? "text-emerald-400" : "text-amber-400"}`} />
            <span className="text-xs font-semibold text-slate-200">System Status</span>
          </div>
          <span
            className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold whitespace-nowrap ${shieldActive ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-300"
              }`}
          >
            {shieldActive ? "Protected" : "Setup Needed"}
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {shieldActive
            ? "Notification Shield and on-device OCR scam defense are actively guarding incoming alerts."
            : "Manual AI Scanner & OCR are ready. Enable Notification Access in Shield to auto-block scam alerts."}
        </p>

        {/* Live Telemetry Strip */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <div className="p-3 rounded-2xl bg-slate-950/65 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <Activity className="w-3.5 h-3.5" />
              <span className="text-[11px] text-slate-400">Inspected</span>
            </div>
            <span className="text-sm font-bold text-white tabular-nums">{inspectedCount}</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/65 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-rose-400">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span className="text-[11px] text-slate-400">Blocked</span>
            </div>
            <span className="text-sm font-bold text-white tabular-nums">{scamsBlocked}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate("notification-shield")}
          className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-semibold rounded-2xl shadow-lg shadow-purple-900/30 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.985] transition-all flex items-center justify-center gap-2"
        >
          <Smartphone className="w-4 h-4 shrink-0" />
          <span>{shieldActive ? "Open Notification Shield" : "Enable Notification Shield"}</span>
        </button>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onNavigate("scanner")}
          className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800/80 hover:border-purple-500/50 active:scale-[0.98] transition-all text-left space-y-2 group"
        >
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
            <Sparkles className="w-4 h-4" />
          </div>
          <h2 className="text-xs font-semibold text-slate-200">Scan Message</h2>
          <p className="text-[10px] text-slate-400">Text or screenshot OCR scan</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("history")}
          className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800/80 hover:border-purple-500/50 active:scale-[0.98] transition-all text-left space-y-2 group"
        >
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
            <History className="w-4 h-4" />
          </div>
          <h2 className="text-xs font-semibold text-slate-200">Scan History</h2>
          <p className="text-[10px] text-slate-400">Inspect past scam reports</p>
        </button>
      </div>

      {/* 1-Tap Threat Checks */}
      <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-semibold text-slate-200">1-Tap Threat Demo Checks</h2>
          </div>
          <span className="text-[10px] text-slate-500">Test AI Engine</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {quickPresets.map((demo) => (
            <button
              key={demo.id}
              type="button"
              onClick={() => {
                if (onQuickScan) onQuickScan(demo);
                else onNavigate("scanner");
              }}
              className="p-2.5 rounded-2xl bg-slate-950/75 border border-slate-800/80 hover:border-purple-500/45 active:scale-[0.98] transition-all text-left"
            >
              <p className="text-[11px] font-semibold text-slate-200 truncate">{demo.label}</p>
              <p className="text-[10px] text-purple-300/80 truncate mt-0.5">{demo.tag}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 1930 Emergency Helpline Card */}
      <div className="p-4 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 shrink-0 rounded-2xl bg-rose-500/20 text-rose-300 flex items-center justify-center">
            <PhoneCall className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-rose-200">Paid a Scammer? Call 1930</h2>
            <p className="text-[10px] text-slate-300 truncate">National Cybercrime Helpline • Freeze funds fast</p>
          </div>
        </div>
        <a
          href="tel:1930"
          className="shrink-0 whitespace-nowrap px-3.5 py-2 rounded-full bg-rose-500/25 border border-rose-400/40 text-rose-100 text-xs font-semibold active:scale-95 transition-transform"
        >
          Call 1930
        </a>
      </div>
    </div>
  );
}
