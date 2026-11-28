"use client";

import { useEffect, useState } from "react";
import { Shield, ShieldAlert, Sparkles, Smartphone, History } from "lucide-react";
import { ScamShieldBridge } from "@/plugins/scamshield-bridge";

interface HomeMobileProps {
  onNavigate: (tab: "home" | "scanner" | "notification-shield" | "history" | "settings") => void;
  isActive?: boolean;
}

export function HomeMobile({ onNavigate, isActive = true }: HomeMobileProps) {
  const [shieldActive, setShieldActive] = useState(false);

  useEffect(() => {
    if (!isActive) return;
    const refresh = () => {
      ScamShieldBridge.getNotificationStatus()
        .then((s) => setShieldActive(s.enabled && s.monitoring))
        .catch(() => {});
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [isActive]);

  return (
    <div className="p-4 space-y-6 max-w-md mx-auto text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-900/40">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-white truncate">ScamShield AI</h1>
            <p className="text-xs text-slate-400 truncate">Personal Scam Protection</p>
          </div>
        </div>
        <span className="shrink-0 whitespace-nowrap px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-semibold">
          {shieldActive ? "Active Shield" : "Shield Ready"}
        </span>
      </div>

      {/* Protection Status Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-purple-900/30 via-slate-900/80 to-slate-900/90 backdrop-blur-xl border border-purple-500/20 shadow-2xl space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shield className={`w-5 h-5 ${shieldActive ? "text-emerald-400" : "text-amber-400"}`} />
            <span className="text-xs font-semibold text-slate-200">System Status</span>
          </div>
          <span
            className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold whitespace-nowrap ${
              shieldActive
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-amber-500/20 text-amber-300"
            }`}
          >
            {shieldActive ? "Protected" : "Setup Needed"}
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          {shieldActive
            ? "Notification Shield and AI scam detection engine are active and monitoring incoming messages."
            : "Manual AI Scanner is active. Enable Notification Access in Shield to auto-scan incoming WhatsApp & SMS alerts."}
        </p>
        <button
          type="button"
          onClick={() => onNavigate("notification-shield")}
          className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-semibold rounded-2xl shadow-lg shadow-purple-900/30 hover:from-purple-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-2"
        >
          <Smartphone className="w-4 h-4 shrink-0" />
          <span>{shieldActive ? "Open Notification Shield" : "Enable Notification Shield"}</span>
        </button>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onNavigate("scanner")}
          className="p-4 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 hover:border-purple-500/50 transition-all text-left space-y-2 group"
        >
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
            <Sparkles className="w-4 h-4" />
          </div>
          <h2 className="text-xs font-semibold text-slate-200">Scan Message</h2>
          <p className="text-[10px] text-slate-400">Analyze text or screenshot instantly</p>
        </button>

        <button
          onClick={() => onNavigate("history")}
          className="p-4 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 hover:border-purple-500/50 transition-all text-left space-y-2 group"
        >
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
            <History className="w-4 h-4" />
          </div>
          <h2 className="text-xs font-semibold text-slate-200">Scan History</h2>
          <p className="text-[10px] text-slate-400">View past intercepts and reports</p>
        </button>
      </div>
    </div>
  );
}
