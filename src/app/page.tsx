"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import {
  AlertOctagon,
  AlertTriangle,
  Ban,
  Check,
  CheckCircle2,
  Command,
  Copy,
  Download,
  KeyRound,
  Link2,
  MessageSquareWarning,
  SearchCheck,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { ApiKeyModal } from "@/components/ApiKeyModal";
import { CommandPalette, PaletteAction } from "@/components/CommandPalette";
import { playAlertChime } from "@/lib/audio";
import { analyzeMessageDeterministic } from "@/lib/heuristic-detector";
import { DEMO_CASES } from "@/lib/scenarios";
import { AnalyzeResult, DemoCase, MessageChannel } from "@/types/scamshield";

const INITIAL_DEMO = DEMO_CASES[0];
const INITIAL_RESULT: AnalyzeResult = {
  ...analyzeMessageDeterministic({
    message: INITIAL_DEMO.message,
    channel: INITIAL_DEMO.channel,
    senderInfo: INITIAL_DEMO.senderInfo,
  }),
  latencyMs: 165,
};

export default function ScamShieldHome() {
  const [activeCaseId, setActiveCaseId] = useState(INITIAL_DEMO.id);
  const [channel, setChannel] = useState<MessageChannel>(INITIAL_DEMO.channel);
  const [senderInfo, setSenderInfo] = useState(INITIAL_DEMO.senderInfo);
  const [message, setMessage] = useState(INITIAL_DEMO.message);
  const [result, setResult] = useState<AnalyzeResult>(INITIAL_RESULT);

  const [isScanning, setIsScanning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [sessionKey, setSessionKey] = useState("");
  const [serverGeminiConfigured, setServerGeminiConfigured] = useState(false);
  const [copiedReply, setCopiedReply] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

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

  const runScan = useCallback(
    async (override?: { message: string; channel: MessageChannel; senderInfo: string }) => {
      const payload = override || { message, channel, senderInfo };
      if (payload.message.trim().length < 5) {
        showToast("Paste a message of at least 5 characters.");
        return;
      }

      setIsScanning(true);
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (sessionKey) headers["x-gemini-key"] = sessionKey;

        const res = await fetch("/api/analyze", {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Scan failed");
        const analyzed = (await res.json()) as AnalyzeResult;
        setResult(analyzed);

        const isSafe = analyzed.verdict === "LOOKS_SAFE";
        playAlertChime(isSafe, soundEnabled);
        if (isSafe) {
          confetti({ particleCount: 55, spread: 60, origin: { y: 0.65 } });
        }
      } catch {
        setResult(analyzeMessageDeterministic(payload));
        showToast("Used built-in Offline Fraud Detector.");
      } finally {
        setIsScanning(false);
      }
    },
    [message, channel, senderInfo, sessionKey, soundEnabled, showToast]
  );

  const loadDemo = useCallback(
    (demo: DemoCase) => {
      setActiveCaseId(demo.id);
      setChannel(demo.channel);
      setSenderInfo(demo.senderInfo);
      setMessage(demo.message);
      void runScan({
        message: demo.message,
        channel: demo.channel,
        senderInfo: demo.senderInfo,
      });
    },
    [runScan]
  );

  const handleCopyReply = async () => {
    await navigator.clipboard.writeText(result.safeReplyDraft);
    setCopiedReply(true);
    showToast("Safe reply copied!");
    setTimeout(() => setCopiedReply(false), 1600);
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runScan, loadDemo, result.safeReplyDraft]
  );

  const isCritical = result.verdict === "CRITICAL_SCAM";
  const isSuspicious = result.verdict === "SUSPICIOUS";
  const verdictStyles = isCritical
    ? {
        border: "border-rose-500/45 bg-rose-950/25",
        badge: "bg-rose-500/20 text-rose-200 border-rose-400/40",
        scoreColor: "text-rose-400",
        label: "CRITICAL SCAM",
        Icon: AlertOctagon,
      }
    : isSuspicious
    ? {
        border: "border-amber-500/45 bg-amber-950/20",
        badge: "bg-amber-500/20 text-amber-200 border-amber-400/40",
        scoreColor: "text-amber-300",
        label: "SUSPICIOUS",
        Icon: AlertTriangle,
      }
    : {
        border: "border-emerald-500/45 bg-emerald-950/20",
        badge: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40",
        scoreColor: "text-emerald-400",
        label: "LOOKS SAFE",
        Icon: ShieldCheck,
      };
  const VerdictIcon = verdictStyles.Icon;

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
              onClick={() => setKeyModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/[0.04] hover:bg-white/[0.09] border border-white/10"
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
              aria-label="Toggle sound"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-xs font-medium text-zinc-200"
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
              Paste any sketchy message. Know before you click or pay.
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

        {/* Message Input Workbench */}
        <section className="vibe-card p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-4">
              <label className="text-[11px] text-zinc-400 block mb-1">Where did you get it?</label>
              <select
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
            <div className="sm:col-span-8">
              <label className="text-[11px] text-zinc-400 block mb-1">
                Sender Name or Number (optional)
              </label>
              <input
                value={senderInfo}
                onChange={(e) => setSenderInfo(e.target.value)}
                placeholder="e.g. +44 7418..., AD-SBIALR, or Unknown HR"
                className="w-full rounded-xl bg-black/45 border border-white/15 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-violet-400"
              />
            </div>
          </div>

          <textarea
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

        {/* Verdict Banner + Risk Score */}
        <section className={`vibe-card p-5 lg:p-6 border ${verdictStyles.border} space-y-4`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${verdictStyles.badge}`}
                >
                  <VerdictIcon className="w-3.5 h-3.5" />
                  {verdictStyles.label}
                </span>
                <span className="text-xs font-medium text-zinc-300">{result.scamCategory}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">{result.headline}</h2>
              <p className="text-sm text-zinc-300 max-w-3xl">{result.plainEnglishSummary}</p>
            </div>

            <div className="vibe-card px-5 py-3.5 text-center shrink-0 min-w-[150px]">
              <p className="text-[11px] uppercase tracking-wider text-zinc-400">Scam Risk Score</p>
              <p className={`text-3xl font-extrabold mt-0.5 ${verdictStyles.scoreColor}`}>
                <AnimatedCounter value={result.riskScore} suffix="/100" />
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">{result.latencyMs}ms scan</p>
            </div>
          </div>

          {/* 3-Step AI Trace */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {result.pipelineTrace.map((step) => (
              <div
                key={step.stage}
                className="rounded-xl p-3 bg-black/35 border border-white/10 space-y-1"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-200">{step.stage}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      step.status === "ALERT"
                        ? "bg-rose-500/20 text-rose-300"
                        : step.status === "WARN"
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-emerald-500/20 text-emerald-300"
                    }`}
                  >
                    {step.status}
                  </span>
                </div>
                <p className="text-xs text-zinc-400">{step.summary}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Detailed Red Flags + Safe Action Plan */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Red Flags + Manipulation Meters */}
          <div className="lg:col-span-7 space-y-5">
            <div className="vibe-card p-5 space-y-3.5">
              <h3 className="text-sm font-semibold text-white">
                Caught Red Flags ({result.redFlags.length})
              </h3>
              {result.redFlags.length === 0 ? (
                <div className="rounded-xl p-4 bg-emerald-500/10 border border-emerald-400/25 flex items-center gap-3 text-sm text-emerald-200">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  Zero scam tricks detected in this message.
                </div>
              ) : (
                <div className="space-y-3">
                  {result.redFlags.map((flag) => (
                    <div
                      key={flag.id}
                      className="rounded-xl p-3.5 bg-black/40 border border-white/10 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-rose-300">{flag.tactic}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-400/30">
                          {flag.severity} RISK
                        </span>
                      </div>
                      <p className="text-xs font-mono bg-rose-950/35 text-rose-200 px-2.5 py-1.5 rounded-lg border border-rose-500/20">
                        &ldquo;{flag.matchedSnippet}&rdquo;
                      </p>
                      <p className="text-xs text-zinc-300">{flag.explanation}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="vibe-card p-5 space-y-3">
              <h3 className="text-sm font-semibold text-white">Manipulation Tactics Breakdown</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: "Urgency & Panic", val: result.tacticScores.urgencyPressure },
                  { label: "Money / PIN Trap", val: result.tacticScores.financialTrap },
                  { label: "Brand / HR Impersonation", val: result.tacticScores.impersonationRisk },
                  { label: "Link Deception", val: result.tacticScores.linkDeception },
                ].map((bar) => (
                  <div key={bar.label} className="rounded-xl p-3 bg-white/[0.03] border border-white/10 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-300">{bar.label}</span>
                      <span className="font-mono font-bold text-zinc-100">{bar.val}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          bar.val >= 65
                            ? "bg-rose-500"
                            : bar.val >= 35
                            ? "bg-amber-400"
                            : "bg-emerald-400"
                        }`}
                        style={{ width: `${bar.val}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Do Not Do + Next Steps + Safe Reply */}
          <div className="lg:col-span-5 space-y-5">
            <div className="vibe-card p-5 space-y-3">
              <h3 className="text-sm font-semibold text-rose-300 flex items-center gap-2">
                <Ban className="w-4 h-4" /> What NOT To Do
              </h3>
              <ul className="space-y-2">
                {result.doNotDo.map((item, idx) => (
                  <li key={idx} className="text-xs text-zinc-200 flex items-start gap-2">
                    <span className="text-rose-400 font-bold">✕</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="vibe-card p-5 space-y-3">
              <h3 className="text-sm font-semibold text-emerald-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Safe Next Steps
              </h3>
              <ul className="space-y-2">
                {result.safeNextSteps.map((item, idx) => (
                  <li key={idx} className="text-xs text-zinc-200 flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="vibe-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">1-Click Safe Reply</h3>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void handleCopyReply()}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-200"
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
                    onClick={handleDownloadReport}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-200"
                    title="Export JSON Report"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-300" />
                    Report
                  </button>
                </div>
              </div>
              <p className="text-xs text-zinc-200 bg-black/45 p-3.5 rounded-xl border border-white/10 leading-relaxed">
                {result.safeReplyDraft}
              </p>
            </div>
          </div>
        </section>
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

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-[#111420]/95 border border-violet-400/40 text-xs font-medium text-zinc-100 shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}
