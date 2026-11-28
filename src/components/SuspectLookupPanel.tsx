"use client";

import { useState } from "react";
import {
  AppWindow,
  AtSign,
  Check,
  Copy,
  ExternalLink,
  Globe,
  Info,
  Landmark,
  Mail,
  QrCode,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

type SuspectCategoryId =
  | "mobile"
  | "email"
  | "bank"
  | "social"
  | "upi"
  | "app"
  | "url";

interface SuspectCategory {
  id: SuspectCategoryId;
  label: string;
  inputLabel: string;
  placeholder: string;
  hint?: string;
  icon: typeof Smartphone;
}

const OFFICIAL_PORTAL_URL = "https://cybercrime.gov.in/suspect-search";

const SUSPECT_CATEGORIES: SuspectCategory[] = [
  {
    id: "mobile",
    label: "Mobile",
    inputLabel: "Mobile Number",
    placeholder: "e.g. 9876543210",
    hint: "Do not add +91 with Mobile number",
    icon: Smartphone,
  },
  {
    id: "email",
    label: "E-mail",
    inputLabel: "Email Address",
    placeholder: "e.g. kyc-alert@example.com",
    icon: Mail,
  },
  {
    id: "bank",
    label: "Bank Account Number",
    inputLabel: "Bank Account Number",
    placeholder: "e.g. 123456789012",
    icon: Landmark,
  },
  {
    id: "social",
    label: "Social Media",
    inputLabel: "Social Media Handle / Profile",
    placeholder: "e.g. @official_support_help",
    icon: AtSign,
  },
  {
    id: "upi",
    label: "UPI ID",
    inputLabel: "UPI ID",
    placeholder: "e.g. refunddesk@okaxis",
    icon: QrCode,
  },
  {
    id: "app",
    label: "Mobile App",
    inputLabel: "Mobile App Name / Package",
    placeholder: "e.g. InstantLoan Pro",
    icon: AppWindow,
  },
  {
    id: "url",
    label: "Website URL",
    inputLabel: "Website URL",
    placeholder: "e.g. https://kyc-update-bank.in",
    icon: Globe,
  },
];

interface SuspectLookupPanelProps {
  onToast: (msg: string) => void;
}

/**
 * Dark-themed Official I4C Suspect Lookup panel covering all 7 cybercrime.gov.in categories.
 */
export function SuspectLookupPanel({ onToast }: SuspectLookupPanelProps) {
  const [selectedId, setSelectedId] = useState<SuspectCategoryId>("mobile");
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const activeCategory =
    SUSPECT_CATEGORIES.find((cat) => cat.id === selectedId) ?? SUSPECT_CATEGORIES[0];

  const handleVerifyOfficial = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();

    if (trimmed && typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(trimmed);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        onToast(`Copied "${trimmed}" — paste & solve CAPTCHA on cybercrime.gov.in`);
      } catch {
        onToast("Opening cybercrime.gov.in — enter your identifier and solve CAPTCHA.");
      }
    } else {
      onToast("Opening official I4C Suspect Search portal in a new tab.");
    }

    window.open(OFFICIAL_PORTAL_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <section
      id="suspect-lookup"
      aria-labelledby="suspect-lookup-heading"
      className="vibe-card p-5 sm:p-6 space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-[11px] font-medium text-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" aria-hidden="true" />
            Verified Official I4C Source · cybercrime.gov.in
          </div>
          <h2 id="suspect-lookup-heading" className="text-lg sm:text-xl font-bold text-white">
            Official Suspect Identifier Check
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300">
            Cross-check suspected numbers, emails, bank accounts, UPI IDs, apps, or URLs against
            India&apos;s National Cyber Crime Reporting Portal.
          </p>
        </div>

        <a
          href={OFFICIAL_PORTAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="glass-pill self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-cyan-200 hover:text-white shrink-0"
        >
          Open Official Portal
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
        </a>
      </div>

      <div
        role="radiogroup"
        aria-label="Suspect identifier category"
        className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5"
      >
        {SUSPECT_CATEGORIES.map((category) => {
          const Icon = category.icon;
          const isSelected = category.id === selectedId;
          return (
            <button
              key={category.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setSelectedId(category.id)}
              className={`relative flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border text-center transition-all ${
                isSelected
                  ? "bg-gradient-to-br from-violet-500/25 to-cyan-500/15 border-violet-400/60 text-white shadow-[0_0_24px_-6px_rgba(139,92,246,0.5)]"
                  : "bg-white/[0.03] border-white/[0.08] text-zinc-300 hover:bg-white/[0.06] hover:border-white/[0.16] hover:text-white"
              }`}
            >
              {isSelected && (
                <span
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-violet-500 border border-white/30 flex items-center justify-center shadow"
                  aria-hidden="true"
                >
                  <Check className="w-3 h-3 text-white" />
                </span>
              )}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isSelected
                    ? "bg-violet-500/30 text-cyan-200 border border-violet-300/30"
                    : "bg-white/[0.05] text-zinc-300 border border-white/[0.06]"
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
              </div>
              <span className="text-[11px] font-medium leading-tight">{category.label}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={(e) => void handleVerifyOfficial(e)} className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="suspect-identifier-input" className="text-xs font-medium text-zinc-200">
            {activeCategory.inputLabel}
          </label>
          {activeCategory.hint && (
            <span className="text-[11px] font-medium text-amber-300/90">{activeCategory.hint}</span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            id="suspect-identifier-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={activeCategory.placeholder}
            className="flex-1 px-4 py-2.5 rounded-full bg-black/40 border border-white/[0.12] text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-400/70"
          />
          <button
            type="submit"
            className="vibe-button-shimmer px-5 py-2.5 text-xs sm:text-sm inline-flex items-center justify-center gap-2 shrink-0"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-200" aria-hidden="true" />
            ) : query.trim() ? (
              <Copy className="w-4 h-4" aria-hidden="true" />
            ) : (
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            )}
            {query.trim() ? "Copy & Check on Official Portal" : "Check on Official Portal"}
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </form>

      <div className="rounded-2xl bg-white/[0.025] border border-white/[0.08] p-3.5 flex items-start gap-3 text-xs text-zinc-300">
        <Info className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1 leading-relaxed">
          <p className="text-zinc-200 font-medium">
            Official Government Repository (I4C · Ministry of Home Affairs)
          </p>
          <p>
            This repository aggregates suspect identifiers from citizen cybercrime complaints filed
            on <span className="text-zinc-100 font-mono">cybercrime.gov.in</span>. Because the
            portal enforces <span className="font-mono text-zinc-200">X-Frame-Options: DENY</span>{" "}
            and live CAPTCHA verification, clicking check copies your input and opens the official
            portal directly in a new tab.
          </p>
        </div>
      </div>
    </section>
  );
}
