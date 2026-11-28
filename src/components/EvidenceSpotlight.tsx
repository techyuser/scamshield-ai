"use client";

import { memo, useMemo } from "react";
import { AlertTriangle, Coins, Globe, Highlighter, Link2, Phone, QrCode, ShieldCheck } from "lucide-react";
import { inspectDomainForensics, parseUpiPaymentUri } from "@/lib/forensics";
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

  const domains = useMemo(() => indicators?.domains ?? [], [indicators?.domains]);
  const domainForensics = useMemo(() => inspectDomainForensics(domains), [domains]);
  const upiIntent = useMemo(() => parseUpiPaymentUri(message), [message]);
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

      {upiIntent && (
        <div className="rounded-xl p-3 bg-amber-500/10 border border-amber-400/30 space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-amber-200 flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
              UPI Payment X-Ray
            </span>
            {upiIntent.amount && (
              <span className="font-mono font-semibold text-rose-200 bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-400/30">
                Debits ₹{upiIntent.amount}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-200 font-mono">
            {upiIntent.payeeVpa && <span>VPA: {upiIntent.payeeVpa}</span>}
            {upiIntent.payeeName && <span>Name: {upiIntent.payeeName}</span>}
            {upiIntent.note && <span>Note: {upiIntent.note}</span>}
          </div>
          {upiIntent.isPullTrap && (
            <p className="text-[11px] text-amber-100/90">
              Warning: Approving a UPI link/PIN pulls money OUT of your bank — UPI never requires a PIN or QR scan to receive refunds.
            </p>
          )}
        </div>
      )}

      {domainForensics.length > 0 && (
        <div className="rounded-xl p-3 bg-white/[0.025] border border-white/[0.08] space-y-2 text-xs">
          <p className="font-semibold text-zinc-200 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-cyan-300" aria-hidden="true" />
            Domain Forensics X-Ray
          </p>
          <div className="space-y-1.5">
            {domainForensics.map((item) => (
              <div
                key={item.domain}
                className="flex flex-wrap items-center justify-between gap-2 text-[11px] bg-black/25 px-2.5 py-1.5 rounded-lg border border-white/[0.06]"
              >
                <div className="flex items-center gap-2">
                  {item.status === "VERIFIED_OFFICIAL" ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-300 shrink-0" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-300 shrink-0" aria-hidden="true" />
                  )}
                  <span className="font-mono text-zinc-100">{item.domain}</span>
                  <span className="text-zinc-400 hidden sm:inline">— {item.detail}</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    item.status === "VERIFIED_OFFICIAL"
                      ? "bg-emerald-500/15 text-emerald-200 border-emerald-400/30"
                      : item.status === "UNVERIFIED"
                      ? "bg-amber-500/15 text-amber-200 border-amber-400/30"
                      : "bg-rose-500/15 text-rose-200 border-rose-400/30"
                  }`}
                >
                  {item.badge}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
