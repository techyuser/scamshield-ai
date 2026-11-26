"use client";

import { memo } from "react";
import { History } from "lucide-react";
import type { ScanHistoryItem } from "@/types/scamshield";

interface RecentScansBarProps {
  history: ScanHistoryItem[];
  onSelect: (item: ScanHistoryItem) => void;
}

/**
 * Displays up to 5 recent scans as clickable frosted glass pills for instant comparison.
 */
export const RecentScansBar = memo(function RecentScansBar({
  history,
  onSelect,
}: RecentScansBarProps) {
  if (history.length <= 1) return null;

  return (
    <section
      className="vibe-card px-5 py-3.5 flex flex-wrap items-center gap-2"
      aria-label="Recent scans"
    >
      <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5 mr-1">
        <History className="w-3.5 h-3.5" aria-hidden="true" /> Recent:
      </span>
      {history.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item)}
          className="glass-pill px-3 py-1 text-xs text-zinc-200 flex items-center gap-2"
        >
          <span className="truncate max-w-[150px]">{item.label}</span>
          <span
            className={`text-[10px] font-bold ${
              item.result.verdict === "CRITICAL_SCAM"
                ? "text-rose-300"
                : item.result.verdict === "SUSPICIOUS"
                ? "text-amber-300"
                : "text-emerald-300"
            }`}
          >
            {item.result.riskScore}/100
          </span>
        </button>
      ))}
    </section>
  );
});
