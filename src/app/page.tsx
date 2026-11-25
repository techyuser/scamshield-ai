"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import {
  Command,
  Cpu,
  History,
  ImagePlus,
  KeyRound,
  Languages,
  Link2,
  MessageSquareWarning,
  SearchCheck,
  ShieldAlert,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { ActionPlanPanel } from "@/components/ActionPlanPanel";
import { ApiKeyModal } from "@/components/ApiKeyModal";
import { CommandPalette, PaletteAction } from "@/components/CommandPalette";
import { PromptArchitectureModal } from "@/components/PromptArchitectureModal";
import { RedFlagPanel } from "@/components/RedFlagPanel";
import { VerdictBanner } from "@/components/VerdictBanner";
import { playAlertChime } from "@/lib/audio";
import { analyzeMessageDeterministic } from "@/lib/heuristic-detector";
import { DEMO_CASES } from "@/lib/scenarios";
import {
  AnalyzeResult,
  DemoCase,
  MessageChannel,
  ReplyLanguage,
  ScanHistoryItem,
} from "@/types/scamshield";

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
        return [next, ...prev.filter((p) => p.message !== msg || p.result.language !== res.language)].slice(0, 5);
      });
    },
    []
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

      setIsScanning(true);
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (sessionKey) headers["x-gemini-key"] = sessionKey;

        const res = await fetch("/api/analyze", {
          method: "POST",
          headers,
          body: JSON.stringify({
            message: targetMsg,
            channel: targetChannel,
            senderInfo: targetSender,
            language: targetLang,
            imageBase64: imagePreview?.base64,
            imageMimeType: imagePreview?.mimeType,
          }),
        });
        if (!res.ok) throw new Error("Scan failed");
        const analyzed = (await res.json()) as AnalyzeResult;
        setResult(analyzed);
        pushHistory(targetLabel, targetMsg, targetChannel, targetSender, analyzed);

        const isSafe = analyzed.verdict === "LOOKS_SAFE";
        playAlertChime(isSafe, soundEnabled);
        if (isSafe) {
          confetti({ particleCount: 55, spread: 60, origin: { y: 0.65 } });
        }
      } catch {
        const fallback = analyzeMessageDeterministic({
          message: targetMsg,
          channel: targetChannel,
          senderInfo: targetSender,
          language: targetLang,
        });
        setResult(fallback);
        pushHistory(targetLabel, targetMsg, targetChannel, targetSender, fallback);
        showToast("Used built-in Offline Fraud Detector.");
      } finally {
        setIsScanning(false);
      }
    },
    [message, channel, senderInfo, language, imagePreview, sessionKey, soundEnabled, pushHistory, showToast]
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

  const handleDownloadReport = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scamshield-report.json";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Downloaded scamshield-report.json");
  };

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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#07080d]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.45)]">
              <ShieldAlert className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-white text-base">
                  ScamShield AI
                </span>
                <span className="hidden sm:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-200 border border-violet-400/30">
                  PromptWars
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                WhatsApp, SMS, Job & UPI Fraud Detector
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setArchModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-zinc-200"
            >
              <Cpu className="w-3.5 h-3.5 text-violet-300" />
              AI Guard
            </button>

            <button
              type="button"
              onClick={() => setKeyModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/[0.04] hover:bg-white/[0.09] border border-white/10"
              aria-label="Configure AI engine settings"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  serverGeminiConfigured || sessionKey || result.engine === "gemini-3.5-flash-lite"
                    ? "bg-emerald-400 animate-pulse"
                    : "bg-cyan-400"
                }`}
              />
              <span className="hidden md:inline text-zinc-200">
                {result.engine === "gemini-3.5-flash-lite"
                  ? "Gemini 3.5 Flash Lite"
                  : serverGeminiConfigured || sessionKey
                  ? "Gemini Ready"
                  : "Smart Hybrid Engine"}
              </span>
              <KeyRound className="w-3 h-3 text-zinc-400" />
            </button>

            <button
              type="button"
              onClick={() => setSoundEnabled((prev) => !prev)}
              className="p-2 rounded-full bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-zinc-300"
              aria-label={soundEnabled ? "Mute alerts" : "Enable alerts"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-xs font-medium text-zinc-200"
              aria-label="Open command menu"
            >
              <Command className="w-3.5 h-3.5 text-violet-300" />
              <span className="hidden sm:inline">Cmd+K</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Hero & 1-Click Demo Cases */}
        <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-400/25 text-xs font-medium text-violet-200">
              <Sparkles className="w-3.5 h-3.5 text-violet-300" />
              Paste any sketchy message or screenshot. Know before you click.
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Spot digital scams in seconds.
            </h1>
          </div>

          <div className="vibe-card px-3.5 py-2.5 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mr-1">
              Try Demo:
            </span>
            {DEMO_CASES.map((demo) => {
              const active = activeCaseId === demo.id;
              return (
                <button
                  key={demo.id}
                  type="button"
                  onClick={() => loadDemo(demo)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    active
                      ? "bg-violet-500/25 text-violet-100 border border-violet-400/50 shadow-[0_0_14px_rgba(139,92,246,0.25)]"
                      : "bg-white/[0.04] text-zinc-300 hover:bg-white/[0.09] border border-white/10"
                  }`}
                >
                  {demo.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Message & Screenshot Input Workbench */}
        <section className="vibe-card p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-4">
              <label htmlFor="channel-select" className="text-[11px] text-zinc-400 block mb-1">
                Where did you get it?
              </label>
              <select
                id="channel-select"
                value={channel}
                onChange={(e) => setChannel(e.target.value as MessageChannel)}
                className="w-full rounded-xl bg-black/45 border border-white/15 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-violet-400"
              >
                <option value="whatsapp">WhatsApp Message</option>
                <option value="sms">SMS / Text Alert</option>
                <option value="job_offer">Job / Internship Offer</option>
                <option value="upi">UPI / Payment Request</option>
                <option value="email">Email</option>
              </select>
            </div>
            <div className="sm:col-span-5">
              <label htmlFor="sender-input" className="text-[11px] text-zinc-400 block mb-1">
                Sender Name or Number (optional)
              </label>
              <input
                id="sender-input"
                value={senderInfo}
                onChange={(e) => setSenderInfo(e.target.value)}
                placeholder="e.g. +44 7418..., AD-SBIALR, or Unknown HR"
                className="w-full rounded-xl bg-black/45 border border-white/15 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-violet-400"
              />
            </div>
            <div className="sm:col-span-3">
              <span className="text-[11px] text-zinc-400 block mb-1">Output Language</span>
              <div className="grid grid-cols-2 rounded-xl bg-black/45 border border-white/15 p-0.5">
                {(["en", "hi"] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => handleToggleLanguage(lang)}
                    className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                      language === lang
                        ? "bg-violet-500/30 text-violet-100"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Languages className="w-3 h-3" />
                    {lang === "en" ? "English" : "हिन्दी"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <textarea
            aria-label="Suspicious message text"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setActiveCaseId("custom");
            }}
            rows={3}
            placeholder="Paste any suspicious WhatsApp message, SMS, UPI QR request, or job offer here..."
            className="w-full rounded-xl bg-black/45 border border-white/15 p-3.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-violet-400"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleScreenshotSelect}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-xs font-medium text-zinc-200"
              >
                <ImagePlus className="w-3.5 h-3.5 text-violet-300" />
                {imagePreview ? imagePreview.name : "Upload Screenshot"}
              </button>
              {imagePreview && (
                <button
                  type="button"
                  onClick={() => setImagePreview(null)}
                  className="p-1 rounded-full bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                  aria-label="Remove screenshot"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10">
                <Link2 className="w-3 h-3 text-cyan-300" /> {result.indicators.urls.length} link(s)
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10">
                <MessageSquareWarning className="w-3 h-3 text-amber-300" />{" "}
                {result.indicators.urgencyPhrases.length} pressure cue(s)
              </span>
            </div>

            <button
              type="button"
              disabled={isScanning}
              onClick={() => void runScan()}
              className="vibe-button-shimmer inline-flex items-center gap-2 px-6 py-2.5 text-sm disabled:opacity-60"
            >
              <SearchCheck className="w-4 h-4" />
              {isScanning ? "Scanning Message..." : "Scan Message Now"}
            </button>
          </div>
        </section>

        {/* Verdict Banner */}
        <VerdictBanner result={result} />

        {/* Detailed Breakdown */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <RedFlagPanel message={message} result={result} />
          <ActionPlanPanel
            result={result}
            copiedReply={copiedReply}
            onCopyReply={() => void handleCopyReply()}
            onDownloadReport={handleDownloadReport}
          />
        </section>

        {/* Recent Scans Quick Switcher */}
        {history.length > 1 && (
          <section className="vibe-card p-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5 mr-1">
              <History className="w-3.5 h-3.5" /> Recent Scans:
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
                className="px-3 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-xs text-zinc-200 flex items-center gap-2"
              >
                <span className="truncate max-w-[160px]">{item.label}</span>
                <span
                  className={`text-[10px] font-bold ${
                    item.result.verdict === "CRITICAL_SCAM"
                      ? "text-rose-400"
                      : item.result.verdict === "SUSPICIOUS"
                      ? "text-amber-300"
                      : "text-emerald-400"
                  }`}
                >
                  {item.result.riskScore}/100
                </span>
              </button>
            ))}
          </section>
        )}
      </main>

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
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-[#111420]/95 border border-violet-400/40 text-xs font-medium text-zinc-100 shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}
