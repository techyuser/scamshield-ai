"use client";

import { memo, useMemo } from "react";
import { Coins, Globe, Highlighter, Link2, Phone } from "lucide-react";
import type { ExtractedIndicators } from "@/types/scamshield";

interface EvidenceSpotlightProps {
  message: string;
  terms: string[];
  indicators?: ExtractedIndicators;
  isSafe: boolean;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Renders the inspected message inside a frosted glass container with flagged tokens and extracted entities styled as pills.
 */
export const EvidenceSpotlight = memo(function EvidenceSpotlight({
  message,
  terms,
  indicators,
  isSafe,
}: EvidenceSpotlightProps) {
  const segments = useMemo(() => {
    const cleanTerms = terms
      .filter((t) => t.trim().length >= 3)
      .sort((a, b) => b.length - a.length);
    if (!cleanTerms.length) return [{ text: message, highlighted: false }];

    const pattern = new RegExp(`(${cleanTerms.map(escapeRegExp).join("|")})`, "gi");
    const parts = message.split(pattern);
    const termSet = new Set(cleanTerms.map((t) => t.toLowerCase()));

    return parts
      .filter((p) => p.length > 0)
      .map((part) => ({
        text: part,
        highlighted: termSet.has(part.toLowerCase()),
      }));
  }, [message, terms]);

  const domains = indicators?.domains ?? [];
  const hasEntities =
    indicators &&
    (indicators.urls.length > 0 ||
      domains.length > 0 ||
      indicators.moneyMentions.length > 0 ||
      indicators.phoneNumbers.length > 0);

  return (
    <div className="rounded-2xl p-4 bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
          <Highlighter className="w-3.5 h-3.5 text-violet-300" aria-hidden="true" />
          Evidence Spotlight
        </h3>
        <span className="glass-pill px-2.5 py-0.5 text-[11px] text-zinc-200">
          {terms.length > 0 && !isSafe ? `${terms.length} flagged cues` : "Clean message"}
        </span>
      </div>
      <p className="text-sm leading-7 text-zinc-200 break-words">
        {segments.map((seg, idx) =>
          seg.highlighted ? (
            <mark
              key={`mark-${idx}-${seg.text.slice(0, 12)}`}
              className="inline-block px-2 py-0.5 mx-0.5 rounded-full bg-rose-500/20 text-rose-200 border border-rose-400/35 font-medium backdrop-blur-md"
            >
              {seg.text}
            </mark>
          ) : (
            <span key={`seg-${idx}-${seg.text.slice(0, 12)}`}>{seg.text}</span>
          )
        )}
      </p>

      {hasEntities && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/[0.06]">
          {indicators.urls.map((url) => (
            <span
              key={url}
              className="glass-pill inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-mono text-cyan-200"
            >
              <Link2 className="w-3 h-3 text-cyan-300" aria-hidden="true" />
              {url}
            </span>
          ))}
          {domains.map((domain) => (
            <span
              key={domain}
              className="glass-pill inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-mono text-violet-200"
            >
              <Globe className="w-3 h-3 text-violet-300" aria-hidden="true" />
              {domain}
            </span>
          ))}
          {indicators.moneyMentions.map((amt) => (
            <span
              key={amt}
              className="glass-pill inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-mono text-amber-200"
            >
              <Coins className="w-3 h-3 text-amber-300" aria-hidden="true" />
              {amt}
            </span>
          ))}
          {indicators.phoneNumbers.map((num) => (
            <span
              key={num}
              className="glass-pill inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-mono text-zinc-200"
            >
              <Phone className="w-3 h-3 text-violet-300" aria-hidden="true" />
              {num}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});
