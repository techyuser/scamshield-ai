"use client";

import { useMemo } from "react";
import { Highlighter } from "lucide-react";

interface EvidenceSpotlightProps {
  message: string;
  terms: string[];
  isSafe: boolean;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Renders the inspected message with risky links, money demands, and scam phrases highlighted inline.
 */
export function EvidenceSpotlight({ message, terms, isSafe }: EvidenceSpotlightProps) {
  const segments = useMemo(() => {
    const cleanTerms = terms.filter((t) => t.trim().length >= 3).sort((a, b) => b.length - a.length);
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

  return (
    <div className="rounded-xl p-4 bg-black/45 border border-white/10 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
          <Highlighter className="w-3.5 h-3.5 text-violet-300" />
          Evidence Spotlight
        </span>
        <span className="text-[11px] text-zinc-400">
          {terms.length > 0 && !isSafe
            ? `${terms.length} suspicious cue(s) highlighted`
            : "No dangerous phrases flagged"}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-zinc-200 break-words">
        {segments.map((seg, idx) =>
          seg.highlighted ? (
            <mark
              key={idx}
              className="px-1.5 py-0.5 mx-0.5 rounded-md bg-rose-500/25 text-rose-200 border border-rose-400/40 font-semibold"
            >
              {seg.text}
            </mark>
          ) : (
            <span key={idx}>{seg.text}</span>
          )
        )}
      </p>
    </div>
  );
}
