"use client";

import { CheckCircle2 } from "lucide-react";
import { EvidenceSpotlight } from "@/components/EvidenceSpotlight";
import { AnalyzeResult } from "@/types/scamshield";

interface RedFlagPanelProps {
  message: string;
  result: AnalyzeResult;
}

/**
 * Renders inline highlighted evidence, detailed red-flag cards, and manipulation tactic scores.
 */
export function RedFlagPanel({ message, result }: RedFlagPanelProps) {
  const tacticBars = [
    { label: "Urgency & Panic", val: result.tacticScores.urgencyPressure },
    { label: "Money / PIN Trap", val: result.tacticScores.financialTrap },
    { label: "Brand / HR Impersonation", val: result.tacticScores.impersonationRisk },
    { label: "Link Deception", val: result.tacticScores.linkDeception },
  ];

  return (
    <div className="lg:col-span-7 space-y-5">
      <div className="vibe-card p-5 space-y-4">
        <EvidenceSpotlight
          message={message}
          terms={result.highlightedTerms}
          isSafe={result.verdict === "LOOKS_SAFE"}
        />

        <div className="space-y-3">
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
      </div>

      <div className="vibe-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white">Manipulation Tactics Breakdown</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tacticBars.map((bar) => (
            <div
              key={bar.label}
              className="rounded-xl p-3 bg-white/[0.03] border border-white/10 space-y-1.5"
            >
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
  );
}
