"use client";

import { useCallback, useMemo, useState } from "react";
import { ArrowLeft, Clock, ShieldAlert } from "lucide-react";
import { VerdictBanner } from "@/components/VerdictBanner";
import { RedFlagPanel } from "@/components/RedFlagPanel";
import { ActionPlanPanel } from "@/components/ActionPlanPanel";
import { analyzeMessageDeterministic } from "@/lib/heuristic-detector";
import { getFriendlyAppInfo } from "@/lib/app-metadata";
import { formatFamilyWarningAlert } from "@/lib/localized-guidance";
import { loadMobileSettings } from "@/lib/mobile-storage";

export interface ThreatReportData {
  message: string;
  source: string;
  riskScore?: number;
  timestamp?: number;
  category?: string;
}

export function ThreatReportSheet({
  report,
  onClose,
}: {
  report: ThreatReportData;
  onClose: () => void;
}) {
  const [seniorMode, setSeniorMode] = useState(false);
  const [copiedReply, setCopiedReply] = useState(false);
  const [copiedAlert, setCopiedAlert] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [sectionTab, setSectionTab] = useState<"verdict" | "flags" | "plan">("verdict");

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);

  const result = useMemo(() => {
    const lang = loadMobileSettings().language;
    const computed = analyzeMessageDeterministic({
      message: report.message,
      channel: "whatsapp",
      senderInfo: report.source,
      language: lang,
    });
    if (typeof report.riskScore === "number" && report.riskScore > computed.riskScore) {
      return {
        ...computed,
        riskScore: report.riskScore,
        verdict:
          report.riskScore >= 65
            ? ("CRITICAL_SCAM" as const)
            : report.riskScore >= 26
            ? ("SUSPICIOUS" as const)
            : computed.verdict,
      };
    }
    return computed;
  }, [report]);

  const appInfo = getFriendlyAppInfo(report.source);

  const copyText = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }, []);

  const handleCopyReply = useCallback(async () => {
    if (!result.safeReplyDraft) return;
    if (await copyText(result.safeReplyDraft)) {
      setCopiedReply(true);
      showToast("Safe reply copied!");
      setTimeout(() => setCopiedReply(false), 1600);
    }
  }, [copyText, result.safeReplyDraft, showToast]);

  const handleCopyFamilyAlert = useCallback(async () => {
    if (await copyText(formatFamilyWarningAlert(result))) {
      setCopiedAlert(true);
      showToast("Family WhatsApp alert copied!");
      setTimeout(() => setCopiedAlert(false), 1600);
    }
  }, [copyText, result, showToast]);

  const handleDownloadReport = useCallback(() => {
    const blob = new Blob([JSON.stringify({ source: report.source, timestamp: report.timestamp, ...result }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scamshield-threat-report.json";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Downloaded scamshield-threat-report.json");
  }, [report.source, report.timestamp, result, showToast]);

  const handleReportCybercrime = useCallback(async () => {
    await copyText(`ScamShield AI: ${result.scamCategory} (${result.riskScore}/100)\n${result.headline}\n${report.message}`);
    window.open("https://cybercrime.gov.in/crimereportanonymously", "_blank", "noopener,noreferrer");
  }, [copyText, report.message, result.headline, result.riskScore, result.scamCategory]);

  return (
    <div className="mobile-report-sheet fixed inset-0 z-[70] bg-slate-950 text-slate-100 overflow-y-auto pt-[max(0.75rem,env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] mobile-card-enter">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[80] px-4 py-2 rounded-full bg-purple-600 text-white text-xs font-medium shadow-lg whitespace-nowrap">
          {toast}
        </div>
      )}

      {/* Sticky Header */}
      <div className="mobile-report-sticky sticky top-0 z-20 bg-slate-950/95 border-b border-slate-800/80 px-4 py-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-medium text-slate-200 active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <div className="flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-bold text-white">Threat Report</span>
        </div>
        <span className={`px-2.5 py-1 rounded-full border text-[10px] font-semibold ${appInfo.badgeClass}`}>
          {appInfo.label}
        </span>
      </div>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        {/* Intercepted Message Preview */}
        <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-medium text-slate-300">{report.category || result.scamCategory}</span>
            {report.timestamp && (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(report.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-200 leading-relaxed break-words">{report.message}</p>
        </div>

        {/* Sub-tabs to avoid long scrolling */}
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-900/90 border border-slate-800/80">
          {[
            { id: "verdict" as const, label: "Overview" },
            { id: "flags" as const, label: `Red Flags (${result.redFlags.length})` },
            { id: "plan" as const, label: "Action Plan" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSectionTab(t.id)}
              className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                sectionTab === t.id
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {sectionTab === "verdict" && (
          <div className="mobile-card-enter">
            <VerdictBanner
              result={result}
              seniorMode={seniorMode}
              onToggleSeniorMode={() => setSeniorMode((prev) => !prev)}
            />
          </div>
        )}

        {sectionTab === "flags" && (
          <div className="mobile-card-enter">
            <RedFlagPanel message={report.message} result={result} />
          </div>
        )}

        {sectionTab === "plan" && (
          <div className="mobile-card-enter">
            <ActionPlanPanel
              result={result}
              copiedReply={copiedReply}
              copiedAlert={copiedAlert}
              onCopyReply={handleCopyReply}
              onCopyFamilyAlert={handleCopyFamilyAlert}
              onDownloadReport={handleDownloadReport}
              onReportCybercrime={handleReportCybercrime}
            />
          </div>
        )}
      </div>
    </div>
  );
}
