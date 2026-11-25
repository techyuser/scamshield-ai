"use client";

import { Ban, Check, Copy, Download, ShieldCheck } from "lucide-react";
import { AnalyzeResult } from "@/types/scamshield";

interface ActionPlanPanelProps {
  result: AnalyzeResult;
  copiedReply: boolean;
  onCopyReply: () => void;
  onDownloadReport: () => void;
}

/**
 * Minimal frosted glass action checklist and 1-click copyable safe reply.
 */
export function ActionPlanPanel({
  result,
  copiedReply,
  onCopyReply,
  onDownloadReport,
}: ActionPlanPanelProps) {
  return (
    <div className="lg:col-span-5 space-y-5">
      <div className="vibe-card p-5 lg:p-6 space-y-3">
        <h3 className="text-sm font-semibold text-rose-300 flex items-center gap-2">
          <Ban className="w-4 h-4" /> What NOT To Do
        </h3>
        <ul className="space-y-2.5">
          {result.doNotDo.map((item, idx) => (
            <li key={idx} className="text-xs text-zinc-200/90 flex items-start gap-2.5 leading-relaxed">
              <span
                className="w-4 h-4 rounded-full bg-rose-500/15 text-rose-300 border border-rose-400/25 flex items-center justify-center text-[10px] shrink-0 mt-0.5"
                aria-hidden="true"
              >
                ✕
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="vibe-card p-5 lg:p-6 space-y-3">
        <h3 className="text-sm font-semibold text-emerald-300 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" /> Safe Next Steps
        </h3>
        <ul className="space-y-2.5">
          {result.safeNextSteps.map((item, idx) => (
            <li key={idx} className="text-xs text-zinc-200/90 flex items-start gap-2.5 leading-relaxed">
              <span
                className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/25 flex items-center justify-center text-[10px] shrink-0 mt-0.5"
                aria-hidden="true"
              >
                ✓
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="vibe-card p-5 lg:p-6 space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">1-Click Safe Reply</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCopyReply}
              className="glass-pill inline-flex items-center gap-1.5 px-3 py-1 text-xs text-zinc-200"
            >
              {copiedReply ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-violet-300" />
              )}
              Copy
            </button>
            <button
              type="button"
              onClick={onDownloadReport}
              className="glass-pill inline-flex items-center gap-1.5 px-3 py-1 text-xs text-zinc-200"
              title="Export JSON Report"
            >
              <Download className="w-3.5 h-3.5 text-cyan-300" />
              Report
            </button>
          </div>
        </div>
        <p className="text-xs text-zinc-200 bg-white/[0.03] p-4 rounded-2xl border border-white/[0.08] leading-relaxed">
          {result.safeReplyDraft}
        </p>
      </div>
    </div>
  );
}
