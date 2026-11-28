"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, Camera, X } from "lucide-react";
import { VerdictBanner } from "@/components/VerdictBanner";
import { RedFlagPanel } from "@/components/RedFlagPanel";
import { ActionPlanPanel } from "@/components/ActionPlanPanel";
import { useScamScanner } from "@/hooks/useScamScanner";
import { formatFamilyWarningAlert } from "@/lib/localized-guidance";
import { appendMobileHistory, loadMobileSettings } from "@/lib/mobile-storage";

export function ScannerMobile({ isActive = true }: { isActive?: boolean }) {
  const [toast, setToast] = useState<string | null>(null);
  const [copiedReply, setCopiedReply] = useState(false);
  const [copiedAlert, setCopiedAlert] = useState(false);
  const [seniorMode, setSeniorMode] = useState(false);
  const lastSavedScanIdRef = useRef<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }, []);

  const scanner = useScamScanner(showToast);

  useEffect(() => {
    if (!isActive) return;
    const settings = loadMobileSettings();
    if (settings.language !== scanner.language) {
      scanner.toggleLanguage(settings.language);
    }
    // Sync language preference when tab becomes active
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  useEffect(() => {
    const latest = scanner.history[0];
    if (!latest || latest.id === "init-1" || latest.id === lastSavedScanIdRef.current) return;
    lastSavedScanIdRef.current = latest.id;
    appendMobileHistory({
      riskScore: latest.result.riskScore,
      preview: latest.message || "Screenshot scan",
      source: "Manual Scanner",
      timestamp: Date.now(),
    });
  }, [scanner.history]);

  const copyText = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }, []);

  const handleCopyReply = useCallback(async () => {
    if (!scanner.result.safeReplyDraft) return;
    if (await copyText(scanner.result.safeReplyDraft)) {
      setCopiedReply(true);
      showToast("Safe reply copied!");
      setTimeout(() => setCopiedReply(false), 1600);
    }
  }, [copyText, scanner.result.safeReplyDraft, showToast]);

  const handleCopyFamilyAlert = useCallback(async () => {
    if (await copyText(formatFamilyWarningAlert(scanner.result))) {
      setCopiedAlert(true);
      showToast("Family WhatsApp alert copied!");
      setTimeout(() => setCopiedAlert(false), 1600);
    }
  }, [copyText, scanner.result, showToast]);

  const handleDownloadReport = useCallback(() => {
    const blob = new Blob([JSON.stringify(scanner.result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scamshield-report.json";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Downloaded scamshield-report.json");
  }, [scanner.result, showToast]);

  const handleReportCybercrime = useCallback(async () => {
    const { scamCategory, riskScore, headline, plainEnglishSummary } = scanner.result;
    await copyText(`ScamShield AI: ${scamCategory} (${riskScore}/100)\n${headline}\n${plainEnglishSummary}`);
    window.open("https://cybercrime.gov.in/crimereportanonymously", "_blank", "noopener,noreferrer");
  }, [copyText, scanner.result]);

  return (
    <div className="p-4 space-y-5 max-w-md mx-auto text-slate-100">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-purple-600/95 text-white text-xs font-medium shadow-lg whitespace-nowrap">
          {toast}
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
            AI Scam Scanner
          </h1>
          <p className="text-xs text-slate-400">Paste suspicious texts or screenshots to analyze</p>
        </div>
        {scanner.message && (
          <button
            type="button"
            onClick={() => scanner.setMessage("")}
            className="shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-300 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

      <div className="p-4 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 shadow-xl space-y-3">
        <textarea
          value={scanner.message}
          onChange={(e) => scanner.setMessage(e.target.value)}
          rows={4}
          placeholder="Paste suspicious SMS, WhatsApp, or email text here..."
          className="w-full min-h-[104px] p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-100 text-xs leading-relaxed focus:outline-none focus:border-purple-500 resize-y"
        />

        {scanner.imagePreview && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-xs text-purple-200">
            <span className="truncate">{scanner.imagePreview.name}</span>
            <button
              type="button"
              onClick={() => scanner.setImagePreview(null)}
              aria-label="Remove screenshot"
              className="shrink-0 p-0.5 rounded-full hover:bg-purple-500/30"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800/70 text-slate-200 text-xs font-medium cursor-pointer hover:bg-slate-800 whitespace-nowrap shrink-0">
            <Camera className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Screenshot</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = () => {
                    scanner.setImagePreview({
                      name: file.name,
                      base64: (reader.result as string).split(",")[1] || "",
                      mimeType: file.type,
                      dataUrl: reader.result as string,
                    });
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={() => void scanner.runScan()}
            disabled={scanner.isScanning || (!scanner.message.trim() && !scanner.imagePreview)}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-semibold rounded-xl shadow-lg shadow-purple-900/40 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            {scanner.isScanning ? (
              <span>Scanning...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>Scan Now</span>
              </>
            )}
          </button>
        </div>
      </div>

      {scanner.result && (
        <div className="space-y-4 mobile-card-enter">
          <VerdictBanner
            result={scanner.result}
            seniorMode={seniorMode}
            onToggleSeniorMode={() => setSeniorMode((prev) => !prev)}
          />
          <RedFlagPanel message={scanner.message} result={scanner.result} />
          <ActionPlanPanel
            result={scanner.result}
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
  );
}
