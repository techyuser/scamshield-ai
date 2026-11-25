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
 * Renders the inspected message inside a frosted glass container with flagged tokens styled as pills.
 */
export function EvidenceSpotlight({ message, terms, isSafe }: EvidenceSpotlightProps) {
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

  return (
    <div className="rounded-2xl p-4 bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
          <Highlighter className="w-3.5 h-3.5 text-violet-300" />
          Evidence Spotlight
        </span>
        <span className="glass-pill px-2.5 py-0.5 text-[11px] text-zinc-300">
          {terms.length > 0 && !isSafe ? `${terms.length} flagged cues` : "Clean message"}
        </span>
      </div>
      <p className="text-sm leading-7 text-zinc-200 break-words">
        {segments.map((seg, idx) =>
          seg.highlighted ? (
            <mark
              key={idx}
              className="inline-block px-2 py-0.5 mx-0.5 rounded-full bg-rose-500/20 text-rose-200 border border-rose-400/35 font-medium backdrop-blur-md"
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
