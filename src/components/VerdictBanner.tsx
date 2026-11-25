"use client";

import { AlertOctagon, AlertTriangle, ShieldCheck, ShieldPlus } from "lucide-react";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { AnalyzeResult } from "@/types/scamshield";

interface VerdictBannerProps {
  result: AnalyzeResult;
}

const VERDICT_THEME = {
  CRITICAL_SCAM: {
    border: "border-rose-500/45 bg-rose-950/25",
    badge: "bg-rose-500/20 text-rose-200 border-rose-400/40",
    scoreColor: "text-rose-400",
    label: "CRITICAL SCAM",
    Icon: AlertOctagon,
  },
  SUSPICIOUS: {
    border: "border-amber-500/45 bg-amber-950/20",
    badge: "bg-amber-500/20 text-amber-200 border-amber-400/40",
    scoreColor: "text-amber-300",
    label: "SUSPICIOUS",
    Icon: AlertTriangle,
  },
  LOOKS_SAFE: {
    border: "border-emerald-500/45 bg-emerald-950/20",
    badge: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40",
    scoreColor: "text-emerald-400",
    label: "LOOKS SAFE",
    Icon: ShieldCheck,
  },
} as const;

/**
 * Displays the color-coded safety verdict, animated risk meter, and 3-stage pipeline trace.
 */
export function VerdictBanner({ result }: VerdictBannerProps) {
  const theme = VERDICT_THEME[result.verdict];
  const VerdictIcon = theme.Icon;

  return (
    <section
      className={`vibe-card p-5 lg:p-6 border ${theme.border} space-y-4`}
      aria-live="polite"
      aria-label="Scan verdict"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${theme.badge}`}
            >
              <VerdictIcon className="w-3.5 h-3.5" />
              {theme.label}
            </span>
            <span className="text-xs font-medium text-zinc-300">{result.scamCategory}</span>
            {result.promptInjectionBlocked && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-violet-500/20 text-violet-200 border border-violet-400/40">
                <ShieldPlus className="w-3 h-3" /> AI Override Trap Blocked
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">{result.headline}</h2>
          <p className="text-sm text-zinc-300 max-w-3xl">{result.plainEnglishSummary}</p>
        </div>

        <div className="vibe-card px-5 py-3.5 text-center shrink-0 min-w-[155px]">
          <p className="text-[11px] uppercase tracking-wider text-zinc-400">Scam Risk Score</p>
          <p className={`text-3xl font-extrabold mt-0.5 ${theme.scoreColor}`}>
            <AnimatedCounter value={result.riskScore} suffix="/100" />
          </p>
          <p className="text-[11px] text-zinc-500 mt-0.5">{result.latencyMs}ms scan</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
        {result.pipelineTrace.map((step) => (
          <div
            key={step.stage}
            className="rounded-xl p-3 bg-black/35 border border-white/10 space-y-1"
          >
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="font-semibold text-zinc-200">{step.stage}</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
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
  );
}
