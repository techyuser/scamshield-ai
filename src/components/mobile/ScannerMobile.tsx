"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, Camera, X, ScanText, ShieldCheck } from "lucide-react";
import { VerdictBanner } from "@/components/VerdictBanner";
import { RedFlagPanel } from "@/components/RedFlagPanel";
import { ActionPlanPanel } from "@/components/ActionPlanPanel";
import { useScamScanner } from "@/hooks/useScamScanner";
import { formatFamilyWarningAlert } from "@/lib/localized-guidance";
import { appendMobileHistory, loadMobileGeminiKey, loadMobileSettings } from "@/lib/mobile-storage";
import { DEMO_CASES } from "@/lib/scenarios";
import { ScamShieldBridge } from "@/plugins/scamshield-bridge";
import type { DemoCase } from "@/types/scamshield";

export interface PresetScanRequest {
  id: number;
  demo: DemoCase;
}

export function ScannerMobile({
  isActive = true,
  presetRequest = null,
}: {
  isActive?: boolean;
  presetRequest?: PresetScanRequest | null;
}) {
  const [toast, setToast] = useState<string | null>(null);
  const [copiedReply, setCopiedReply] = useState(false);
  const [copiedAlert, setCopiedAlert] = useState(false);
  const [seniorMode, setSeniorMode] = useState(false);
  const [isReadingOcr, setIsReadingOcr] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [resultTab, setResultTab] = useState<"verdict" | "flags" | "plan">("verdict");
  const lastSavedScanIdRef = useRef<string | null>(null);
  const lastHandledPresetIdRef = useRef<number>(0);
  const initializedRef = useRef(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }, []);

  const scanner = useScamScanner(showToast);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      if (!presetRequest) {
        scanner.setMessage("");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isActive) return;
    const settings = loadMobileSettings();
    if (settings.language !== scanner.language) {
      if (hasScanned && scanner.message.trim().length >= 12) {
        scanner.toggleLanguage(settings.language);
      } else {
        scanner.setLanguage(settings.language);
      }
    }
    const savedKey = loadMobileGeminiKey();
    if (savedKey !== scanner.sessionKey) {
      scanner.setSessionKey(savedKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  useEffect(() => {
    if (!presetRequest || presetRequest.id === lastHandledPresetIdRef.current) return;
    lastHandledPresetIdRef.current = presetRequest.id;
    setHasScanned(true);
    setResultTab("verdict");
    scanner.loadDemo(presetRequest.demo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetRequest]);

  useEffect(() => {
    const latest = scanner.history[0];
    if (!latest || latest.id === "init-1" || latest.id === lastSavedScanIdRef.current) return;
    lastSavedScanIdRef.current = latest.id;
    appendMobileHistory({
      riskScore: latest.result.riskScore,
      preview: latest.message || "Screenshot scan",
      source: "Manual Scanner",
      timestamp: Date.now(),
      category: latest.result.scamCategory,
    });
  }, [scanner.history]);

  const handleRunManualScan = async () => {
    setHasScanned(true);
    setResultTab("verdict");
    await scanner.runScan();
  };

  const handleScreenshotSelected = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1] || "";
      scanner.setImagePreview({
        name: file.name,
        base64,
        mimeType: file.type,
        dataUrl,
      });

      setIsReadingOcr(true);
      try {
        const ocr = await ScamShieldBridge.extractTextFromImage({ base64 });
        const ocrText = ocr?.text?.trim() || "";
        if (ocrText.length >= 6) {
          scanner.setMessage(ocrText);
          setHasScanned(true);
          setResultTab("verdict");
          showToast("Extracted text from screenshot — scanning now");
          await scanner.runScan({
            message: ocrText,
            channel: "whatsapp",
            senderInfo: `Screenshot (${file.name})`,
            label: `Screenshot: ${file.name}`,
          });
        } else if (loadMobileGeminiKey()) {
          setHasScanned(true);
          setResultTab("verdict");
          await scanner.runScan();
        } else {
          scanner.setMessage("");
          showToast("No readable text in screenshot. Paste text or add Gemini key in Settings.");
        }
      } catch {
        showToast("Screenshot attached. Tap Scan Now to analyze.");
      } finally {
        setIsReadingOcr(false);
      }
    };
    reader.readAsDataURL(file);
  };

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
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-purple-600/95 text-white text-xs font-medium shadow-lg max-w-[90vw] text-center">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
            AI Scam Scanner
          </h1>
          <p className="text-xs text-slate-400">Paste suspicious texts or upload screenshots</p>
        </div>
        {(scanner.message || scanner.imagePreview || hasScanned) && (
          <button
            type="button"
            onClick={() => {
              scanner.setMessage("");
              scanner.setImagePreview(null);
              setHasScanned(false);
            }}
            className="shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-300 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

      {/* Quick preset chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {DEMO_CASES.map((demo) => (
          <button
            key={demo.id}
            type="button"
            onClick={() => {
              setHasScanned(true);
              setResultTab("verdict");
              scanner.loadDemo(demo);
            }}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors ${
              hasScanned && scanner.activeCaseId === demo.id
                ? "bg-purple-600/30 border-purple-400/50 text-purple-100"
                : "bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700"
            }`}
          >
            {demo.label}
          </button>
        ))}
      </div>

      <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800/80 shadow-xl space-y-3">
        <textarea
          value={scanner.message}
          onChange={(e) => scanner.setMessage(e.target.value)}
          rows={4}
          placeholder="Paste suspicious SMS, WhatsApp, UPI, or job offer text here..."
          className="w-full min-h-[104px] p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-100 text-xs leading-relaxed focus:outline-none focus:border-purple-500 resize-y"
        />

        {isReadingOcr && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-xs text-cyan-200">
            <ScanText className="w-4 h-4 animate-pulse shrink-0" />
            <span>Reading text from screenshot...</span>
          </div>
        )}

        {scanner.imagePreview && (
          <div className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/30">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={scanner.imagePreview.dataUrl}
                alt="Attached screenshot preview"
                className="w-11 h-11 rounded-xl object-cover border border-purple-400/30 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs font-medium text-purple-100 truncate">{scanner.imagePreview.name}</p>
                <p className="text-[10px] text-purple-300/80">Screenshot attached</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => scanner.setImagePreview(null)}
              aria-label="Remove screenshot"
              className="shrink-0 p-1.5 rounded-full bg-purple-500/20 text-purple-200 hover:bg-purple-500/35"
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
                if (file) void handleScreenshotSelected(file);
                e.target.value = "";
              }}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={() => void handleRunManualScan()}
            disabled={scanner.isScanning || isReadingOcr || (!scanner.message.trim() && !scanner.imagePreview)}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-semibold rounded-xl shadow-lg shadow-purple-900/40 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0"
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

      {!hasScanned ? (
        <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800/70 text-center space-y-2">
          <ShieldCheck className="w-8 h-8 text-purple-400/80 mx-auto" />
          <p className="text-xs font-semibold text-slate-200">Ready to Analyze</p>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Paste a suspicious message, upload a screenshot for on-device OCR scanning, or tap one of the quick sample chips above.
          </p>
        </div>
      ) : (
        <div className="space-y-4 mobile-card-enter">
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-900/90 border border-slate-800/80">
            {[
              { id: "verdict" as const, label: "Overview" },
              { id: "flags" as const, label: `Red Flags (${scanner.result.redFlags.length})` },
              { id: "plan" as const, label: "Action Plan" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setResultTab(t.id)}
                className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                  resultTab === t.id
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {resultTab === "verdict" && (
            <div className="mobile-card-enter">
              <VerdictBanner
                result={scanner.result}
                seniorMode={seniorMode}
                onToggleSeniorMode={() => setSeniorMode((prev) => !prev)}
              />
            </div>
          )}

          {resultTab === "flags" && (
            <div className="mobile-card-enter">
              <RedFlagPanel message={scanner.message} result={scanner.result} />
            </div>
          )}

          {resultTab === "plan" && (
            <div className="mobile-card-enter">
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
      )}
    </div>
  );
}
