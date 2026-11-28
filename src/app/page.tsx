"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { ActionPlanPanel } from "@/components/ActionPlanPanel";
import { ApiKeyModal } from "@/components/ApiKeyModal";
import { CommandPalette } from "@/components/CommandPalette";
import type { PaletteAction } from "@/components/CommandPalette";
import { HeaderNav } from "@/components/HeaderNav";
import { MessageComposer } from "@/components/MessageComposer";
import { PromptArchitectureModal } from "@/components/PromptArchitectureModal";
import { RecentScansBar } from "@/components/RecentScansBar";
import { RedFlagPanel } from "@/components/RedFlagPanel";
import { SuspectLookupPanel } from "@/components/SuspectLookupPanel";
import { VerdictBanner } from "@/components/VerdictBanner";
import MobileAppPage from "@/app/mobile/page";
import { useScamScanner } from "@/hooks/useScamScanner";
import { ANDROID_BETA_APK_URL } from "@/lib/constants";
import { formatFamilyWarningAlert } from "@/lib/localized-guidance";
import { DEMO_CASES } from "@/lib/scenarios";

/**
 * ScamShield AI primary page assembling the header, 1-click demos, message composer, and safety panels.
 */
export default function ScamShieldHome() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [archModalOpen, setArchModalOpen] = useState(false);
  const [seniorMode, setSeniorMode] = useState(false);
  const [isCapacitorNative, setIsCapacitorNative] = useState(false);
  const [copiedReply, setCopiedReply] = useState(false);
  const [copiedAlert, setCopiedAlert] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (cap?.isNativePlatform?.()) {
      setIsCapacitorNative(true);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
      if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    };
  }, []);

  const scanner = useScamScanner(showToast);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const copyTextSafely = useCallback(
    async (text: string): Promise<boolean> => {
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
        showToast("Clipboard unavailable — please select and copy the text manually.");
        return false;
      }
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        showToast("Clipboard permission denied — please copy the text manually.");
        return false;
      }
    },
    [showToast]
  );

  const handleCopyReply = useCallback(async () => {
    const ok = await copyTextSafely(scanner.result.safeReplyDraft);
    if (!ok) return;
    setCopiedReply(true);
    showToast("Safe reply copied!");
    if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    replyTimerRef.current = setTimeout(() => setCopiedReply(false), 1600);
  }, [copyTextSafely, scanner.result.safeReplyDraft, showToast]);

  const handleCopyFamilyAlert = useCallback(async () => {
    const formatted = formatFamilyWarningAlert(scanner.result);
    const ok = await copyTextSafely(formatted);
    if (!ok) return;
    setCopiedAlert(true);
    showToast("Family WhatsApp alert copied!");
    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    alertTimerRef.current = setTimeout(() => setCopiedAlert(false), 1600);
  }, [copyTextSafely, scanner.result, showToast]);

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
    const { scamCategory, riskScore, headline, plainEnglishSummary, indicators } = scanner.result;
    const details = [
      `ScamShield AI Incident Summary`,
      `Category: ${scamCategory} (Risk Score: ${riskScore}/100)`,
      `Headline: ${headline}`,
      `Summary: ${plainEnglishSummary}`,
      indicators.urls.length ? `Suspicious URLs: ${indicators.urls.join(", ")}` : null,
      indicators.domains.length ? `Domains: ${indicators.domains.join(", ")}` : null,
      indicators.phoneNumbers.length ? `Phone Numbers: ${indicators.phoneNumbers.join(", ")}` : null,
      indicators.moneyMentions.length ? `Amounts Mentioned: ${indicators.moneyMentions.join(", ")}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const ok = await copyTextSafely(details);
    if (ok) {
      showToast("Incident summary copied — paste into cybercrime.gov.in form!");
    }
    window.open("https://cybercrime.gov.in/crimereportanonymously", "_blank", "noopener,noreferrer");
  }, [copyTextSafely, scanner.result, showToast]);

  const paletteActions: PaletteAction[] = useMemo(
    () => [
      {
        id: "scan-now",
        group: "Action",
        label: "Scan Current Message",
        hint: "Analyze",
        run: () => void scanner.runScan(),
      },
      ...DEMO_CASES.map((d) => ({
        id: `demo-${d.id}`,
        group: "1-Click Demo Case",
        label: d.label,
        hint: d.tag,
        run: () => scanner.loadDemo(d),
      })),
      {
        id: "inject-test",
        group: "PromptWars",
        label: "Run AI Override Prompt-Injection Test",
        hint: "Security",
        run: () => scanner.loadInjectionTest("override"),
      },
      {
        id: "toggle-lang",
        group: "Language",
        label:
          scanner.language === "en" ? "Switch Output to Hindi (हिन्दी)" : "Switch Output to English",
        hint: "EN / HI",
        run: () => scanner.toggleLanguage(scanner.language === "en" ? "hi" : "en"),
      },
      {
        id: "suspect-lookup",
        group: "Action",
        label: "Jump to Official Suspect Identifier Check",
        hint: "I4C",
        run: () => document.getElementById("suspect-lookup")?.scrollIntoView({ behavior: "smooth" }),
      },
      {
        id: "arch-modal",
        group: "PromptWars",
        label: "Inspect AI Prompt Pipeline & Injection Guard",
        hint: "Architecture",
        run: () => setArchModalOpen(true),
      },
      {
        id: "copy-reply",
        group: "Action",
        label: "Copy Safe Reply Message",
        hint: "Clipboard",
        run: () => void handleCopyReply(),
      },
      {
        id: "download-beta-apk",
        group: "Mobile App",
        label: "Download Android App (Beta APK)",
        hint: "Beta",
        run: () => window.open(ANDROID_BETA_APK_URL, "_blank", "noopener,noreferrer"),
      },
      {
        id: "api-key",
        group: "Settings",
        label: "Configure Optional Gemini API Key",
        hint: "Engine",
        run: () => setKeyModalOpen(true),
      },
    ],
    [scanner, handleCopyReply]
  );

  const liveGeminiReady =
    scanner.serverGeminiConfigured ||
    Boolean(scanner.sessionKey) ||
    scanner.result.engine === "gemini-3.5-flash-lite";

  const engineName =
    scanner.result.engine === "gemini-3.5-flash-lite"
      ? "Gemini 3.5 Flash Lite"
      : liveGeminiReady
      ? "Gemini Ready"
      : "Smart Hybrid";

  if (isCapacitorNative) {
    return <MobileAppPage />;
  }

  return (
    <div className="min-h-screen flex flex-col desktop-only-shell">
      <HeaderNav
        engineName={engineName}
        liveGeminiReady={liveGeminiReady}
        soundEnabled={scanner.soundEnabled}
        onToggleSound={() => scanner.setSoundEnabled((prev) => !prev)}
        onOpenSuspectLookup={() =>
          document.getElementById("suspect-lookup")?.scrollIntoView({ behavior: "smooth" })
        }
        onOpenArchitecture={() => setArchModalOpen(true)}
        onOpenSettings={() => setKeyModalOpen(true)}
        onOpenPalette={() => setPaletteOpen(true)}
      />

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6 focus:outline-none"
      >
        <section className="text-center space-y-4">
          <div className="glass-pill inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-medium text-violet-200 mx-auto">
            <Sparkles className="w-3.5 h-3.5 text-violet-300" aria-hidden="true" />
            Paste any sketchy message or screenshot. Know before you click.
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Spot digital scams in seconds.
          </h1>
          <div
            className="flex flex-wrap items-center justify-center gap-2 pt-1"
            role="group"
            aria-label="1-click demo scenarios"
          >
            {DEMO_CASES.map((demo) => {
              const active = scanner.activeCaseId === demo.id;
              return (
                <button
                  key={demo.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => scanner.loadDemo(demo)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    active ? "glass-pill-active text-white" : "glass-pill text-zinc-200"
                  }`}
                >
                  {demo.label}
                </button>
              );
            })}
          </div>
        </section>

        <MessageComposer
          channel={scanner.channel}
          senderInfo={scanner.senderInfo}
          message={scanner.message}
          language={scanner.language}
          imagePreview={scanner.imagePreview}
          indicators={scanner.result.indicators}
          validationError={scanner.validationError}
          isScanning={scanner.isScanning}
          onChannelChange={scanner.setChannel}
          onSenderChange={scanner.setSenderInfo}
          onMessageChange={(msg) => {
            scanner.setMessage(msg);
            scanner.setActiveCaseId("custom");
          }}
          onLanguageToggle={scanner.toggleLanguage}
          onImageChange={scanner.setImagePreview}
          onScan={() => void scanner.runScan()}
          onTestInjection={() => scanner.loadInjectionTest("override")}
          onClear={scanner.clearScanner}
          onToast={showToast}
        />

        <VerdictBanner
          result={scanner.result}
          seniorMode={seniorMode}
          onToggleSeniorMode={() => setSeniorMode((prev) => !prev)}
        />

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5" aria-label="Detailed analysis">
          <RedFlagPanel message={scanner.message} result={scanner.result} />
          <ActionPlanPanel
            result={scanner.result}
            copiedReply={copiedReply}
            copiedAlert={copiedAlert}
            onCopyReply={() => void handleCopyReply()}
            onCopyFamilyAlert={() => void handleCopyFamilyAlert()}
            onDownloadReport={handleDownloadReport}
            onReportCybercrime={() => void handleReportCybercrime()}
          />
        </section>

        <SuspectLookupPanel
          indicators={scanner.result.indicators}
          senderInfo={scanner.senderInfo}
          scannedMessage={scanner.message}
          onToast={showToast}
        />

        <RecentScansBar history={scanner.history} onSelect={scanner.restoreHistoryItem} />
      </main>

      <footer className="max-w-5xl w-full mx-auto px-4 sm:px-6 pb-8 pt-2 text-center text-xs text-zinc-300">
        ScamShield AI assists consumer fraud awareness. For active financial fraud in India, call{" "}
        <strong className="text-zinc-100">1930</strong> or report at{" "}
        <strong className="text-zinc-100">cybercrime.gov.in</strong>.{" "}
        <span className="text-zinc-500">·</span>{" "}
        <a
          href={ANDROID_BETA_APK_URL}
          download="scamshield-ai-v0.1.0-dev-debug.apk"
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-300 hover:text-cyan-200 underline underline-offset-2"
        >
          Download Android App (Beta APK)
        </a>
      </footer>

      {paletteOpen && (
        <CommandPalette onClose={() => setPaletteOpen(false)} actions={paletteActions} />
      )}

      {keyModalOpen && (
        <ApiKeyModal
          onClose={() => setKeyModalOpen(false)}
          sessionKey={scanner.sessionKey}
          onSaveKey={scanner.setSessionKey}
          serverConfigured={scanner.serverGeminiConfigured}
        />
      )}

      {archModalOpen && (
        <PromptArchitectureModal
          onClose={() => setArchModalOpen(false)}
          onRunAttack={(variant) => scanner.loadInjectionTest(variant)}
        />
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-full bg-white/[0.08] backdrop-blur-2xl border border-violet-400/40 text-xs font-medium text-zinc-100 shadow-2xl"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
