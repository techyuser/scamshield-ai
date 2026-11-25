"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import {
  History,
  ImagePlus,
  Languages,
  Link2,
  MessageSquareWarning,
  SearchCheck,
  Sparkles,
  X,
} from "lucide-react";
import { ActionPlanPanel } from "@/components/ActionPlanPanel";
import { ApiKeyModal } from "@/components/ApiKeyModal";
import { CommandPalette, PaletteAction } from "@/components/CommandPalette";
import { HeaderNav } from "@/components/HeaderNav";
import { PromptArchitectureModal } from "@/components/PromptArchitectureModal";
import { RedFlagPanel } from "@/components/RedFlagPanel";
import { VerdictBanner } from "@/components/VerdictBanner";
import { playAlertChime } from "@/lib/audio";
import { analyzeClientFallback } from "@/lib/client-analyzer";
import { analyzeMessageDeterministic } from "@/lib/heuristic-detector";
import { DEMO_CASES } from "@/lib/scenarios";
import {
  AnalyzeResult,
  DemoCase,
  MessageChannel,
  ReplyLanguage,
  ScanHistoryItem,
} from "@/types/scamshield";

const CHANNEL_OPTIONS: { id: MessageChannel; label: string }[] = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "sms", label: "SMS" },
  { id: "job_offer", label: "Job Offer" },
  { id: "upi", label: "UPI" },
  { id: "email", label: "Email" },
];

const INITIAL_DEMO = DEMO_CASES[0];
const INITIAL_RESULT: AnalyzeResult = {
  ...analyzeMessageDeterministic({
    message: INITIAL_DEMO.message,
    channel: INITIAL_DEMO.channel,
    senderInfo: INITIAL_DEMO.senderInfo,
    language: "en",
  }),
  latencyMs: 165,
};

export default function ScamShieldHome() {
  const [activeCaseId, setActiveCaseId] = useState(INITIAL_DEMO.id);
  const [channel, setChannel] = useState<MessageChannel>(INITIAL_DEMO.channel);
  const [senderInfo, setSenderInfo] = useState(INITIAL_DEMO.senderInfo);
  const [message, setMessage] = useState(INITIAL_DEMO.message);
  const [language, setLanguage] = useState<ReplyLanguage>("en");
  const [imagePreview, setImagePreview] = useState<{
    name: string;
    base64: string;
    mimeType: string;
  } | null>(null);

  const [result, setResult] = useState<AnalyzeResult>(INITIAL_RESULT);
  const [history, setHistory] = useState<ScanHistoryItem[]>([
    {
      id: "init-1",
      label: INITIAL_DEMO.label,
      channel: INITIAL_DEMO.channel,
      senderInfo: INITIAL_DEMO.senderInfo,
      message: INITIAL_DEMO.message,
      result: INITIAL_RESULT,
    },
  ]);

  const [isScanning, setIsScanning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [archModalOpen, setArchModalOpen] = useState(false);
  const [sessionKey, setSessionKey] = useState("");
  const [serverGeminiConfigured, setServerGeminiConfigured] = useState(false);
  const [copiedReply, setCopiedReply] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeScanAbortRef = useRef<AbortController | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.serverGeminiConfigured) setServerGeminiConfigured(true);
      })
      .catch(() => {});
  }, []);

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

  const pushHistory = useCallback(
    (label: string, msg: string, ch: MessageChannel, snd: string, res: AnalyzeResult) => {
      setHistory((prev) => {
        const next: ScanHistoryItem = {
          id: `${Date.now()}`,
          label,
          channel: ch,
          senderInfo: snd,
          message: msg,
          result: res,
        };
        return [
          next,
          ...prev.filter((p) => p.message !== msg || p.result.language !== res.language),
        ].slice(0, 5);
      });
    },
    []
  );

  const celebrateIfSafe = useCallback(
    (analyzed: AnalyzeResult) => {
      const isSafe = analyzed.verdict === "LOOKS_SAFE";
      playAlertChime(isSafe, soundEnabled);
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (isSafe && !prefersReducedMotion) {
        confetti({ particleCount: 55, spread: 60, origin: { y: 0.65 } });
      }
    },
    [soundEnabled]
  );

  const runScan = useCallback(
    async (override?: {
      message: string;
      channel: MessageChannel;
      senderInfo: string;
      language?: ReplyLanguage;
      label?: string;
    }) => {
      const targetMsg = override ? override.message : message;
      const targetChannel = override ? override.channel : channel;
      const targetSender = override ? override.senderInfo : senderInfo;
      const targetLang = override?.language ?? language;
      const targetLabel = override?.label || targetMsg.slice(0, 28) || "Screenshot Scan";

      if (!imagePreview && targetMsg.trim().length < 5) {
        showToast("Paste a message of at least 5 characters or upload a screenshot.");
        return;
      }

      activeScanAbortRef.current?.abort();
      const controller = new AbortController();
      activeScanAbortRef.current = controller;

      setIsScanning(true);
      const reqBody = {
        message: targetMsg,
        channel: targetChannel,
        senderInfo: targetSender,
        language: targetLang,
        imageBase64: imagePreview?.base64,
        imageMimeType: imagePreview?.mimeType,
      };
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (sessionKey) headers["x-gemini-key"] = sessionKey;

        const res = await fetch("/api/analyze", {
          method: "POST",
          headers,
          body: JSON.stringify(reqBody),
          signal: controller.signal,
        });
        const analyzed = res.ok
          ? ((await res.json()) as AnalyzeResult)
          : await analyzeClientFallback(reqBody, sessionKey);
        setResult(analyzed);
        pushHistory(targetLabel, targetMsg, targetChannel, targetSender, analyzed);
        celebrateIfSafe(analyzed);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        const fallback = await analyzeClientFallback(reqBody, sessionKey);
        setResult(fallback);
        pushHistory(targetLabel, targetMsg, targetChannel, targetSender, fallback);
      } finally {
        if (activeScanAbortRef.current === controller) {
          setIsScanning(false);
        }
      }
    },
    [
      message,
      channel,
      senderInfo,
      language,
      imagePreview,
      sessionKey,
      pushHistory,
      celebrateIfSafe,
      showToast,
    ]
  );

  const loadDemo = useCallback(
    (demo: DemoCase) => {
      setActiveCaseId(demo.id);
      setChannel(demo.channel);
      setSenderInfo(demo.senderInfo);
      setMessage(demo.message);
      setImagePreview(null);
      void runScan({
        message: demo.message,
        channel: demo.channel,
        senderInfo: demo.senderInfo,
        label: demo.label,
      });
    },
    [runScan]
  );

  const handleToggleLanguage = useCallback(
    (nextLang: ReplyLanguage) => {
      setLanguage(nextLang);
      void runScan({
        message,
        channel,
        senderInfo,
        language: nextLang,
        label: activeCaseId === "custom" ? message.slice(0, 28) : undefined,
      });
    },
    [message, channel, senderInfo, activeCaseId, runScan]
  );

  const handleScreenshotSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      showToast("Please upload a PNG, JPEG, or WebP screenshot.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      showToast("Screenshot must be under 3 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      const base64 = dataUrl.split(",")[1] || "";
      setImagePreview({ name: file.name, base64, mimeType: file.type });
      showToast(`Attached ${file.name} — click Scan Message Now.`);
    };
    reader.readAsDataURL(file);
  };

  const handleCopyReply = useCallback(async () => {
    await navigator.clipboard.writeText(result.safeReplyDraft);
    setCopiedReply(true);
    showToast("Safe reply copied!");
    setTimeout(() => setCopiedReply(false), 1600);
  }, [result.safeReplyDraft, showToast]);

  const handleDownloadReport = useCallback(() => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scamshield-report.json";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Downloaded scamshield-report.json");
  }, [result, showToast]);

  const paletteActions: PaletteAction[] = useMemo(
    () => [
      {
        id: "scan-now",
        group: "Action",
        label: "Scan Current Message",
        hint: "Analyze",
        run: () => void runScan(),
      },
      ...DEMO_CASES.map((d) => ({
        id: `demo-${d.id}`,
        group: "1-Click Demo Case",
        label: d.label,
        hint: d.tag,
        run: () => loadDemo(d),
      })),
      {
        id: "toggle-lang",
        group: "Language",
        label: language === "en" ? "Switch Output to Hindi (हिन्दी)" : "Switch Output to English",
        hint: "EN / HI",
        run: () => handleToggleLanguage(language === "en" ? "hi" : "en"),
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
        id: "api-key",
        group: "Settings",
        label: "Configure Optional Gemini API Key",
        hint: "Engine",
        run: () => setKeyModalOpen(true),
      },
    ],
    [runScan, loadDemo, language, handleToggleLanguage, handleCopyReply]
  );

  const liveGeminiReady =
    serverGeminiConfigured || Boolean(sessionKey) || result.engine === "gemini-3.5-flash-lite";
  const engineName =
    result.engine === "gemini-3.5-flash-lite"
      ? "Gemini 3.5 Flash Lite"
      : liveGeminiReady
      ? "Gemini Ready"
      : "Smart Hybrid";

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderNav
        engineName={engineName}
        liveGeminiReady={liveGeminiReady}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
        onOpenArchitecture={() => setArchModalOpen(true)}
        onOpenSettings={() => setKeyModalOpen(true)}
        onOpenPalette={() => setPaletteOpen(true)}
      />

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6 focus:outline-none"
      >
        {/* Minimal Centered Hero + Frosted Demo Pills */}
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
              const active = activeCaseId === demo.id;
              return (
                <button
                  key={demo.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => loadDemo(demo)}
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

        {/* Glass Composer Card */}
        <section className="vibe-card p-5 lg:p-6 space-y-4" aria-label="Message scanner input">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Message channel">
              {CHANNEL_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={channel === opt.id}
                  onClick={() => setChannel(opt.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    channel === opt.id
                      ? "glass-pill-active text-white"
                      : "glass-pill text-zinc-300 hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="glass-pill p-0.5 flex items-center" role="group" aria-label="Output language">
              {(["en", "hi"] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  aria-pressed={language === lang}
                  onClick={() => handleToggleLanguage(lang)}
                  className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 transition-all ${
                    language === lang
                      ? "bg-violet-500/35 text-white shadow-sm"
                      : "text-zinc-300 hover:text-white"
                  }`}
                >
                  <Languages className="w-3 h-3" aria-hidden="true" />
                  {lang === "en" ? "English" : "हिन्दी"}
                </button>
              ))}
            </div>
          </div>

          <input
            aria-label="Sender name or phone number"
            value={senderInfo}
            onChange={(e) => setSenderInfo(e.target.value)}
            placeholder="Optional sender (e.g. +44 7418..., AD-SBIALR, Unknown HR)"
            className="w-full rounded-full bg-white/[0.03] border border-white/[0.08] px-4 py-2 text-xs text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-violet-400/60"
          />

          <textarea
            aria-label="Suspicious message text"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setActiveCaseId("custom");
            }}
            rows={3}
            placeholder="Paste any suspicious WhatsApp message, SMS, UPI QR request, or job offer here..."
            className="w-full rounded-2xl bg-white/[0.03] border border-white/[0.08] p-4 text-sm text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-violet-400/60"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-300">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-label="Upload scam screenshot"
                className="hidden"
                onChange={handleScreenshotSelect}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="glass-pill inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-zinc-200"
              >
                <ImagePlus className="w-3.5 h-3.5 text-violet-300" aria-hidden="true" />
                {imagePreview ? imagePreview.name : "Upload Screenshot"}
              </button>
              {imagePreview && (
                <button
                  type="button"
                  onClick={() => setImagePreview(null)}
                  className="glass-pill p-1.5 text-rose-300"
                  aria-label="Remove uploaded screenshot"
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              )}
              <span className="glass-pill inline-flex items-center gap-1 px-3 py-1">
                <Link2 className="w-3 h-3 text-cyan-300" aria-hidden="true" />{" "}
                {result.indicators.urls.length} link(s)
              </span>
              <span className="glass-pill inline-flex items-center gap-1 px-3 py-1">
                <MessageSquareWarning className="w-3 h-3 text-amber-300" aria-hidden="true" />{" "}
                {result.indicators.urgencyPhrases.length} urgency cue(s)
              </span>
            </div>

            <button
              type="button"
              disabled={isScanning}
              onClick={() => void runScan()}
              className="vibe-button-shimmer inline-flex items-center gap-2 px-6 py-2.5 text-sm disabled:opacity-60"
            >
              <SearchCheck className="w-4 h-4" aria-hidden="true" />
              {isScanning ? "Scanning..." : "Scan Message Now"}
            </button>
          </div>
        </section>

        <VerdictBanner result={result} />

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5" aria-label="Detailed analysis">
          <RedFlagPanel message={message} result={result} />
          <ActionPlanPanel
            result={result}
            copiedReply={copiedReply}
            onCopyReply={() => void handleCopyReply()}
            onDownloadReport={handleDownloadReport}
          />
        </section>

        {history.length > 1 && (
          <section className="vibe-card px-5 py-3.5 flex flex-wrap items-center gap-2" aria-label="Recent scans">
            <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5 mr-1">
              <History className="w-3.5 h-3.5" aria-hidden="true" /> Recent:
            </span>
            {history.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setMessage(item.message);
                  setChannel(item.channel);
                  setSenderInfo(item.senderInfo);
                  setLanguage(item.result.language);
                  setResult(item.result);
                }}
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
        )}
      </main>

      <footer className="max-w-5xl w-full mx-auto px-4 sm:px-6 pb-8 pt-2 text-center text-xs text-zinc-300">
        ScamShield AI assists consumer fraud awareness. For active financial fraud in India, call{" "}
        <strong className="text-zinc-100">1930</strong> or report at{" "}
        <strong className="text-zinc-100">cybercrime.gov.in</strong>.
      </footer>

      {paletteOpen && (
        <CommandPalette onClose={() => setPaletteOpen(false)} actions={paletteActions} />
      )}

      {keyModalOpen && (
        <ApiKeyModal
          onClose={() => setKeyModalOpen(false)}
          sessionKey={sessionKey}
          onSaveKey={setSessionKey}
          serverConfigured={serverGeminiConfigured}
        />
      )}

      {archModalOpen && <PromptArchitectureModal onClose={() => setArchModalOpen(false)} />}

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
