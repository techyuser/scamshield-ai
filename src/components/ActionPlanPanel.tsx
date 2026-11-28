"use client";

import { memo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  Check,
  Copy,
  Download,
  ExternalLink,
  Flag,
  PhoneCall,
  Share2,
  ShieldCheck,
} from "lucide-react";
import type { AnalyzeResult } from "@/types/scamshield";

interface ActionPlanPanelProps {
  result: AnalyzeResult;
  copiedReply: boolean;
  copiedAlert: boolean;
  onCopyReply: () => void;
  onCopyFamilyAlert: () => void;
  onDownloadReport: () => void;
  onReportCybercrime: () => void;
}

/**
 * Minimal frosted glass consumer safety checklist, WhatsApp family alert copy, and 1-click safe reply.
 */
export const ActionPlanPanel = memo(function ActionPlanPanel({
  result,
  copiedReply,
  copiedAlert,
  onCopyReply,
  onCopyFamilyAlert,
  onDownloadReport,
  onReportCybercrime,
}: ActionPlanPanelProps) {
  const [emergencyMode, setEmergencyMode] = useState(false);

  return (
    <div className="lg:col-span-5 space-y-5">
      {result.verdict !== "LOOKS_SAFE" && (
        <div
          className="glass-pill p-1 grid grid-cols-2 gap-1"
          role="tablist"
          aria-label="Response guidance mode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={!emergencyMode}
            onClick={() => setEmergencyMode(false)}
            className={`py-1.5 px-3 rounded-full text-xs font-medium transition-all ${
              !emergencyMode
                ? "bg-violet-500/35 text-white shadow-sm"
                : "text-zinc-300 hover:text-white"
            }`}
          >
            Preventive Plan
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={emergencyMode}
            onClick={() => setEmergencyMode(true)}
            className={`py-1.5 px-3 rounded-full text-xs font-medium transition-all inline-flex items-center justify-center gap-1.5 ${
              emergencyMode
                ? "bg-rose-500/35 text-rose-100 border border-rose-400/40 shadow-sm"
                : "text-amber-200 hover:text-white"
            }`}
          >
            <PhoneCall className="w-3 h-3" aria-hidden="true" />
            Already Paid? (1930)
          </button>
        </div>
      )}

      {emergencyMode && result.verdict !== "LOOKS_SAFE" ? (
        <div className="vibe-card p-5 lg:p-6 space-y-4 border-rose-400/35">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/35 text-[11px] font-semibold text-rose-200">
              <AlertTriangle className="w-3 h-3" aria-hidden="true" />
              Golden Hour Freeze Window (First 2 Hours)
            </div>
            <h3 className="text-base font-bold text-white">1930 Emergency Recovery Checklist</h3>
            <p className="text-xs text-zinc-300">
              Act immediately to trigger CFCFRMS bank-account freeze before funds are withdrawn.
            </p>
          </div>

          <ol className="space-y-2.5 text-xs text-zinc-200 list-decimal list-inside leading-relaxed">
            <li>
              <strong className="text-rose-200">Call 1930 immediately</strong> (National Cybercrime
              Helpline) and report the unauthorized debit.
            </li>
            <li>
              <strong className="text-white">Block your UPI / Card / NetBanking</strong> inside your
              official bank app or bank toll-free helpline.
            </li>
            <li>
              <strong className="text-white">Keep 4 proofs ready:</strong> 12-digit UTR /
              Transaction Reference ID, exact amount &amp; timestamp, suspect UPI ID/account, and
              chat/receipt screenshots.
            </li>
            <li>
              <strong className="text-white">Do NOT call helpline numbers</strong> sent by the
              scammer or install screen-sharing apps (AnyDesk / TeamViewer).
            </li>
          </ol>
        </div>
      ) : (
        <>
          <div className="vibe-card p-5 lg:p-6 space-y-3">
            <h3 className="text-sm font-semibold text-rose-300 flex items-center gap-2">
              <Ban className="w-4 h-4" aria-hidden="true" /> What NOT To Do
            </h3>
            <ul className="space-y-2.5">
              {result.doNotDo.map((item, idx) => (
                <li
                  key={`donot-${idx}-${item.slice(0, 24)}`}
                  className="text-xs text-zinc-200 flex items-start gap-2.5 leading-relaxed"
                >
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
              <ShieldCheck className="w-4 h-4" aria-hidden="true" /> Safe Next Steps
            </h3>
            <ul className="space-y-2.5">
              {result.safeNextSteps.map((item, idx) => (
                <li
                  key={`step-${idx}-${item.slice(0, 24)}`}
                  className="text-xs text-zinc-200 flex items-start gap-2.5 leading-relaxed"
                >
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
        </>
      )}

      <div className="vibe-card p-5 lg:p-6 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">1-Click Safe Reply</h3>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={onCopyReply}
              className="glass-pill inline-flex items-center gap-1.5 px-3 py-1 text-xs text-zinc-200"
              aria-label="Copy Reply — safe message template"
            >
              {copiedReply ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-violet-300" aria-hidden="true" />
              )}
              Copy Reply
            </button>
            <button
              type="button"
              onClick={onCopyFamilyAlert}
              className="glass-pill inline-flex items-center gap-1.5 px-3 py-1 text-xs text-zinc-200"
              aria-label="Family Alert — copy WhatsApp scam warning"
            >
              {copiedAlert ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              ) : (
                <Share2 className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
              )}
              Family Alert
            </button>
            <button
              type="button"
              onClick={onDownloadReport}
              className="glass-pill inline-flex items-center gap-1.5 px-3 py-1 text-xs text-zinc-200"
              aria-label="Report — download JSON diagnostic report"
            >
              <Download className="w-3.5 h-3.5 text-cyan-300" aria-hidden="true" />
              Report
            </button>
          </div>
        </div>
        <p className="text-xs text-zinc-200 bg-white/[0.03] p-4 rounded-2xl border border-white/[0.08] leading-relaxed">
          {result.safeReplyDraft}
        </p>
      </div>

      {result.verdict !== "LOOKS_SAFE" && (
        <div className="vibe-card p-5 lg:p-6 space-y-3 border-rose-400/25">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-rose-200 flex items-center gap-2">
                <Flag className="w-4 h-4 text-rose-400" aria-hidden="true" />
                Report to Cybercrime Portal
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Copies a ready-to-paste incident summary &amp; extracted suspect indicators, then
                opens the official anonymous reporting form.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onReportCybercrime}
            className="w-full py-2.5 px-4 rounded-full bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-xs font-semibold text-rose-100 inline-flex items-center justify-center gap-2 transition-all"
          >
            <Flag className="w-3.5 h-3.5 text-rose-300" aria-hidden="true" />
            Copy Incident &amp; Report on cybercrime.gov.in
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
});
