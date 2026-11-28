"use client";

import { useEffect, useState } from "react";
import { Clock, History, ChevronRight } from "lucide-react";
import { loadMobileHistory, type MobileHistoryEntry } from "@/lib/mobile-storage";
import { getFriendlyAppInfo } from "@/lib/app-metadata";
import { ScamShieldBridge } from "@/plugins/scamshield-bridge";

function formatRelativeTime(ts: number): string {
  const diffMin = Math.max(1, Math.floor((Date.now() - ts) / 60000));
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export function HistoryMobile({
  isActive = true,
  onInspectEntry,
}: {
  isActive?: boolean;
  onInspectEntry?: (entry: MobileHistoryEntry) => void;
}) {
  const [entries, setEntries] = useState<MobileHistoryEntry[]>([]);
  const [onlySuspicious, setOnlySuspicious] = useState(true);

  useEffect(() => {
    if (!isActive) return;
    const localEntries = loadMobileHistory();
    ScamShieldBridge.getShieldData()
      .then((shield) => {
        const nativeAlerts: MobileHistoryEntry[] = (shield.alerts || [])
          .filter((a) => a.riskScore > 25)
          .map((a, idx) => ({
            id: `native-${a.timestamp}-${idx}`,
            riskScore: a.riskScore,
            preview: a.preview,
            source: `${a.packageName} (Notification Shield)`,
            timestamp: a.timestamp,
            category: a.category,
          }));
        const seen = new Set(localEntries.map((e) => `${e.timestamp}-${e.preview.slice(0, 24)}`));
        const merged = [
          ...localEntries,
          ...nativeAlerts.filter((a) => !seen.has(`${a.timestamp}-${a.preview.slice(0, 24)}`)),
        ].sort((a, b) => b.timestamp - a.timestamp);
        setEntries(merged);
      })
      .catch(() => {
        setEntries(localEntries);
      });
  }, [isActive]);

  const visibleEntries = onlySuspicious ? entries.filter((e) => e.riskScore > 25) : entries;

  return (
    <div className="p-4 space-y-5 max-w-md mx-auto text-slate-100">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
            Threat Reports
          </h1>
          <p className="text-xs text-slate-400">Suspicious messages &gt;25% risk (chats excluded)</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-900/90 border border-slate-800/80">
        <button
          type="button"
          onClick={() => setOnlySuspicious(true)}
          className={`py-2 rounded-xl text-xs font-semibold transition-all ${
            onlySuspicious ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white" : "text-slate-400"
          }`}
        >
          Suspicious &gt;25% ({entries.filter((e) => e.riskScore > 25).length})
        </button>
        <button
          type="button"
          onClick={() => setOnlySuspicious(false)}
          className={`py-2 rounded-xl text-xs font-semibold transition-all ${
            !onlySuspicious ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white" : "text-slate-400"
          }`}
        >
          All Scans ({entries.length})
        </button>
      </div>

      {visibleEntries.length === 0 ? (
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/70 text-center space-y-2">
          <History className="w-7 h-7 text-slate-500 mx-auto" />
          <p className="text-xs text-slate-300 font-medium">
            {onlySuspicious ? "No messages above 25% suspicion" : "No scan history yet"}
          </p>
          <p className="text-[11px] text-slate-500">
            Regular safe chats are excluded. Any message scoring above 25% will appear here with a full threat report.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleEntries.map((item) => {
            const appInfo = getFriendlyAppInfo(item.source);
            const isHigh = item.riskScore >= 65;
            const isMed = item.riskScore > 25 && item.riskScore < 65;
            const badgeCls = isHigh
              ? "bg-rose-500/20 text-rose-400"
              : isMed
              ? "bg-amber-500/20 text-amber-300"
              : "bg-emerald-500/20 text-emerald-400";
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onInspectEntry?.(item)}
                className="w-full text-left p-4 rounded-3xl bg-slate-900/90 border border-slate-800/80 hover:border-purple-500/50 active:scale-[0.985] transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeCls}`}>
                      Risk {item.riskScore}/100
                    </span>
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-medium ${appInfo.badgeClass}`}>
                      {appInfo.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1 whitespace-nowrap">
                    <Clock className="w-3 h-3" /> {formatRelativeTime(item.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-slate-200 font-medium break-words line-clamp-2">{item.preview}</p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800/40">
                  <span className="truncate">{item.category || "Analyzed Message"}</span>
                  <span className="text-purple-400 font-semibold inline-flex items-center gap-0.5 shrink-0">
                    Open Report <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
