"use client";

import { memo } from "react";
import { CheckCircle2 } from "lucide-react";
import { EvidenceSpotlight } from "@/components/EvidenceSpotlight";
import type { AnalyzeResult } from "@/types/scamshield";

interface RedFlagPanelProps {
  message: string;
  result: AnalyzeResult;
}

/**
 * Minimal frosted glass red-flag breakdown and WCAG-compliant tactic progress meters.
 */
export const RedFlagPanel = memo(function RedFlagPanel({ message, result }: RedFlagPanelProps) {
  const tacticBars = [
    { label: "Urgency & Panic", val: result.tacticScores.urgencyPressure },
    { label: "Money / PIN Trap", val: result.tacticScores.financialTrap },
    { label: "Brand / HR Impersonation", val: result.tacticScores.impersonationRisk },
    { label: "Link Deception", val: result.tacticScores.linkDeception },
  ];

  return (
    <div className="lg:col-span-7 space-y-5">
      <div className="vibe-card p-5 lg:p-6 space-y-4">
        <EvidenceSpotlight
          message={message}
          terms={result.highlightedTerms}
          indicators={result.indicators}
          isSafe={result.verdict === "LOOKS_SAFE"}
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Caught Red Flags</h3>
            <span className="glass-pill px-2.5 py-0.5 text-[11px] text-zinc-200">
              {result.redFlags.length} detected
            </span>
          </div>
          {result.redFlags.length === 0 ? (
            <div className="rounded-2xl p-4 bg-emerald-500/10 border border-emerald-400/25 flex items-center gap-3 text-sm text-emerald-200 backdrop-blur-md">
              <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
              Zero scam tricks detected in this message.
            </div>
          ) : (
            <div className="space-y-2.5">
              {result.redFlags.map((flag) => (
                <article
                  key={flag.id}
                  className="rounded-2xl p-4 bg-white/[0.03] border border-white/[0.08] space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-semibold text-rose-300">{flag.tactic}</h4>
                    <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-200 border border-rose-400/30">
                      {flag.severity} RISK
                    </span>
                  </div>
                  <p className="text-xs font-mono bg-rose-500/10 text-rose-200 px-3 py-1.5 rounded-xl border border-rose-400/20">
                    &ldquo;{flag.matchedSnippet}&rdquo;
                  </p>
                  <p className="text-xs text-zinc-300 leading-relaxed">{flag.explanation}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="vibe-card p-5 lg:p-6 space-y-3.5">
        <h3 className="text-sm font-semibold text-white">Manipulation Signals</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tacticBars.map((bar) => (
            <div
              key={bar.label}
              className="rounded-2xl p-3.5 bg-white/[0.03] border border-white/[0.08] space-y-2"
            >
              <div className="flex justify-between text-xs">
                <span className="text-zinc-200">{bar.label}</span>
                <span className="font-mono font-semibold text-zinc-100">{bar.val}%</span>
              </div>
              <div
                className="h-1.5 rounded-full bg-white/10 overflow-hidden"
                role="progressbar"
                aria-label={bar.label}
                aria-valuenow={bar.val}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    bar.val >= 65
                      ? "bg-gradient-to-r from-rose-500 to-pink-400"
                      : bar.val >= 35
                      ? "bg-gradient-to-r from-amber-500 to-yellow-300"
                      : "bg-gradient-to-r from-emerald-500 to-teal-300"
                  }`}
                  style={{ width: `${bar.val}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
