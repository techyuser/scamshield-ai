"use client";

import { memo, useEffect, useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Eye,
  ShieldCheck,
  ShieldPlus,
  Square,
  Volume2,
} from "lucide-react";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import type { AnalyzeResult } from "@/types/scamshield";

interface VerdictBannerProps {
  result: AnalyzeResult;
  seniorMode: boolean;
  onToggleSeniorMode: () => void;
}

const VERDICT_THEME = {
  CRITICAL_SCAM: {
    glow: "border-rose-400/30 shadow-[0_24px_60px_-20px_rgba(244,63,94,0.3)]",
    pill: "bg-rose-500/20 text-rose-200 border-rose-400/40",
    ring: "border-rose-400/40 bg-rose-500/10",
    scoreColor: "text-rose-300",
    label: "CRITICAL SCAM",
    Icon: AlertOctagon,
  },
  SUSPICIOUS: {
    glow: "border-amber-400/30 shadow-[0_24px_60px_-20px_rgba(245,158,11,0.25)]",
    pill: "bg-amber-500/20 text-amber-200 border-amber-400/40",
    ring: "border-amber-400/40 bg-amber-500/10",
    scoreColor: "text-amber-200",
    label: "SUSPICIOUS",
    Icon: AlertTriangle,
  },
  LOOKS_SAFE: {
    glow: "border-emerald-400/30 shadow-[0_24px_60px_-20px_rgba(16,185,129,0.25)]",
    pill: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40",
    ring: "border-emerald-400/40 bg-emerald-500/10",
    scoreColor: "text-emerald-300",
    label: "LOOKS SAFE",
    Icon: ShieldCheck,
  },
} as const;

/**
 * Frosted glass verdict banner displaying safety status, animated risk ring, and pipeline pills.
 */
export const VerdictBanner = memo(function VerdictBanner({
  result,
  seniorMode,
  onToggleSeniorMode,
}: VerdictBannerProps) {
  const theme = VERDICT_THEME[result.verdict];
  const VerdictIcon = theme.Icon;
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [result]);

  const handleToggleSpeech = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const spokenText = [
      result.headline,
      result.plainEnglishSummary,
      result.safeNextSteps[0] || "",
    ]
      .filter(Boolean)
      .join(". ");
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = result.language === "hi" ? "hi-IN" : "en-IN";
    utterance.rate = 0.96;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <section
      className={`vibe-card p-6 lg:p-7 ${theme.glow} space-y-5`}
      aria-live="polite"
      aria-label="Scan verdict summary"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-md ${theme.pill}`}
            >
              <VerdictIcon className="w-3.5 h-3.5" aria-hidden="true" />
              {theme.label}
            </span>
            <span className="glass-pill px-3 py-1 text-xs font-medium text-zinc-200">
              {result.scamCategory}
            </span>
            <span className="glass-pill px-2.5 py-1 text-[11px] font-medium text-cyan-200">
              {result.engine === "gemini-3.5-flash-lite"
                ? "Gemini 3.5 Flash Lite"
                : "Offline Heuristic"}
            </span>
            {result.promptInjectionBlocked && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-medium bg-violet-500/20 text-violet-200 border border-violet-400/40 backdrop-blur-md">
                <ShieldPlus className="w-3 h-3" aria-hidden="true" /> AI Override Blocked
              </span>
            )}
          </div>
          <h2
            className={`${
              seniorMode ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
            } font-bold tracking-tight text-white`}
          >
            {result.headline}
          </h2>
          <p
            className={`${
              seniorMode ? "text-base sm:text-lg" : "text-sm"
            } text-zinc-200 max-w-2xl leading-relaxed`}
          >
            {result.plainEnglishSummary}
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleToggleSpeech}
              className="glass-pill inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-200"
            >
              {speaking ? (
                <Square className="w-3 h-3 fill-current text-rose-300" aria-hidden="true" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-cyan-300" aria-hidden="true" />
              )}
              {speaking ? "Stop Voice" : "Listen Aloud"}
            </button>

            <button
              type="button"
              aria-pressed={seniorMode}
              onClick={onToggleSeniorMode}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                seniorMode
                  ? "glass-pill-active text-white"
                  : "glass-pill text-zinc-200"
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-violet-300" aria-hidden="true" />
              {seniorMode ? "Senior View: ON" : "Senior / Family View"}
            </button>
          </div>
        </div>

        <div
          className={`rounded-3xl px-6 py-4 text-center shrink-0 min-w-[164px] border backdrop-blur-2xl ${theme.ring}`}
        >
          <p className="text-[11px] uppercase tracking-widest text-zinc-300">Risk Score</p>
          <p className={`text-3xl font-extrabold mt-0.5 ${theme.scoreColor}`}>
            <AnimatedCounter value={result.riskScore} suffix="/100" />
          </p>
          <p className="text-[11px] text-zinc-300 mt-0.5">{result.latencyMs}ms scan</p>
        </div>
      </div>

      {seniorMode ? (
        <div className="rounded-2xl p-5 bg-white/[0.04] border border-white/[0.12] space-y-3">
          <p className="text-base font-bold text-white">Simple Advice for Family &amp; Seniors</p>
          <ul className="space-y-2.5 text-sm sm:text-base text-zinc-100 leading-relaxed">
            {result.safeNextSteps.slice(0, 3).map((step, idx) => (
              <li key={`senior-step-${idx}`} className="flex items-start gap-2.5">
                <span className="text-emerald-300 font-bold">✓</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {result.pipelineTrace.map((step) => (
          <div
            key={step.stage}
            className="rounded-2xl px-4 py-3 bg-white/[0.03] border border-white/[0.08] backdrop-blur-lg space-y-1"
          >
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="font-medium text-zinc-200">{step.stage}</span>
              <span
                className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                  step.status === "ALERT"
                    ? "bg-rose-500/15 text-rose-200 border-rose-400/30"
                    : step.status === "WARN"
                    ? "bg-amber-500/15 text-amber-200 border-amber-400/30"
                    : "bg-emerald-500/15 text-emerald-200 border-emerald-400/30"
                }`}
              >
                {step.status}
              </span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">{step.summary}</p>
          </div>
        ))}
      </div>
      )}
    </section>
  );
});
