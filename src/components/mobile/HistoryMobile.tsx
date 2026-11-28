"use client";

import { useEffect, useState } from "react";
import { Clock, History } from "lucide-react";
import { loadMobileHistory, type MobileHistoryEntry } from "@/lib/mobile-storage";

function formatRelativeTime(ts: number): string {
  const diffMin = Math.max(1, Math.floor((Date.now() - ts) / 60000));
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export function HistoryMobile({ isActive = true }: { isActive?: boolean }) {
  const [entries, setEntries] = useState<MobileHistoryEntry[]>([]);

  useEffect(() => {
    if (isActive) {
      setEntries(loadMobileHistory());
    }
  }, [isActive]);

  return (
    <div className="p-4 space-y-6 max-w-md mx-auto text-slate-100">
      <div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
          Scan & Alert History
        </h1>
        <p className="text-xs text-slate-400">Log of past manual scans and intercepted notifications</p>
      </div>

      {entries.length === 0 ? (
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/70 text-center space-y-2">
          <History className="w-7 h-7 text-slate-500 mx-auto" />
          <p className="text-xs text-slate-300 font-medium">No scan history yet</p>
          <p className="text-[11px] text-slate-500">
            Scans from the Scanner tab and intercepted notifications will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((item) => {
            const isHigh = item.riskScore >= 65;
            const isMed = item.riskScore >= 35 && item.riskScore < 65;
            const badgeCls = isHigh
              ? "bg-rose-500/20 text-rose-400"
              : isMed
              ? "bg-amber-500/20 text-amber-300"
              : "bg-emerald-500/20 text-emerald-400";
            return (
              <div
                key={item.id}
                className="p-4 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeCls}`}>
                    Risk Score: {item.riskScore}/100
                  </span>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1 whitespace-nowrap">
                    <Clock className="w-3 h-3" /> {formatRelativeTime(item.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium break-words">{item.preview}</p>
                <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800/40">
                  Source: {item.source}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
