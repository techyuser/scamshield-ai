"use client";

import { useRef } from "react";
import {
  AlertCircle,
  ImagePlus,
  Languages,
  Link2,
  MessageSquareWarning,
  RotateCcw,
  SearchCheck,
  ShieldPlus,
  Sparkles,
  X,
} from "lucide-react";
import type { ImageAttachment } from "@/hooks/useScamScanner";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_FILE_BYTES,
  MAX_MESSAGE_LENGTH,
  MAX_SENDER_LENGTH,
} from "@/lib/constants";
import type { ExtractedIndicators, MessageChannel, ReplyLanguage } from "@/types/scamshield";

const CHANNEL_OPTIONS: { id: MessageChannel; label: string }[] = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "sms", label: "SMS" },
  { id: "job_offer", label: "Job Offer" },
  { id: "upi", label: "UPI" },
  { id: "email", label: "Email" },
];

interface MessageComposerProps {
  channel: MessageChannel;
  senderInfo: string;
  message: string;
  language: ReplyLanguage;
  imagePreview: ImageAttachment | null;
  indicators: ExtractedIndicators;
  validationError: string | null;
  isScanning: boolean;
  onChannelChange: (channel: MessageChannel) => void;
  onSenderChange: (sender: string) => void;
  onMessageChange: (msg: string) => void;
  onLanguageToggle: (lang: ReplyLanguage) => void;
  onImageChange: (img: ImageAttachment | null) => void;
  onScan: () => void;
  onTestInjection: () => void;
  onClear: () => void;
  onToast: (msg: string) => void;
}

/**
 * Frosted glass message & screenshot composer with pill channel selectors, validation cues, and PromptWars override tester.
 */
export function MessageComposer({
  channel,
  senderInfo,
  message,
  language,
  imagePreview,
  indicators,
  validationError,
  isScanning,
  onChannelChange,
  onSenderChange,
  onMessageChange,
  onLanguageToggle,
  onImageChange,
  onScan,
  onTestInjection,
  onClear,
  onToast,
}: MessageComposerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
      onToast("Please upload a PNG, JPEG, or WebP screenshot.");
      return;
    }
    if (file.size > MAX_IMAGE_FILE_BYTES) {
      onToast("Screenshot must be under 3 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      onToast("Could not read screenshot file.");
    };
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      const base64 = dataUrl.split(",")[1] || "";
      onImageChange({ name: file.name, base64, mimeType: file.type, dataUrl });
      onToast(`Attached ${file.name} — click Scan Message Now.`);
    };
    reader.readAsDataURL(file);
  };

  const handleLoadSampleScreenshot = async () => {
    try {
      const response = await fetch("/demos/amazon-otp-scam.png");
      if (!response.ok) {
        onToast("Sample screenshot could not be loaded.");
        return;
      }
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onerror = () => onToast("Could not read sample screenshot.");
      reader.onload = () => {
        const dataUrl = typeof reader.result === "string" ? reader.result : "";
        const base64 = dataUrl.split(",")[1] || "";
        onChannelChange("sms");
        onSenderChange("Unknown Sender");
        onMessageChange("");
        onImageChange({
          name: "amazon-otp-scam.png",
          base64,
          mimeType: "image/png",
          dataUrl,
        });
        onToast("Loaded sample Amazon phishing screenshot — click Scan Message Now!");
      };
      reader.readAsDataURL(blob);
    } catch {
      onToast("Sample screenshot could not be loaded.");
    }
  };

  const canClear = Boolean(message || senderInfo || imagePreview);

  return (
    <section className="vibe-card p-5 lg:p-6 space-y-4" aria-label="Message scanner input">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Message channel">
          {CHANNEL_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              aria-pressed={channel === opt.id}
              onClick={() => onChannelChange(opt.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                channel === opt.id
                  ? "glass-pill-active text-white"
                  : "glass-pill text-zinc-300 hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="glass-pill p-0.5 flex items-center" role="group" aria-label="Output language">
          {(["en", "hi"] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              aria-pressed={language === lang}
              onClick={() => onLanguageToggle(lang)}
              className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 transition-all ${
                language === lang
                  ? "bg-violet-500/35 text-white shadow-sm"
                  : "text-zinc-300 hover:text-white"
              }`}
            >
              <Languages className="w-3 h-3" aria-hidden="true" />
              {lang === "en" ? "English" : "हिन्दी"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="scanner-sender-input" className="sr-only">
          Sender name or phone number
        </label>
        <input
          id="scanner-sender-input"
          aria-label="Sender name or phone number"
          maxLength={MAX_SENDER_LENGTH}
          value={senderInfo}
          onChange={(e) => onSenderChange(e.target.value)}
          placeholder="Optional sender (e.g. +44 7418..., AD-SBIALR, Unknown HR)"
          className="w-full rounded-full bg-white/[0.03] border border-white/[0.08] px-4 py-2 text-xs text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-violet-400/60"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="scanner-message-input" className="sr-only">
          Suspicious message text
        </label>
        <textarea
          id="scanner-message-input"
          aria-label="Suspicious message text"
          aria-invalid={Boolean(validationError)}
          aria-describedby={
            validationError
              ? "scanner-validation-error scanner-character-hint"
              : "scanner-character-hint"
          }
          maxLength={MAX_MESSAGE_LENGTH}
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          rows={3}
          placeholder="Paste any suspicious WhatsApp message, SMS, UPI QR request, or job offer here..."
          className={`w-full rounded-2xl bg-white/[0.03] border p-4 text-sm text-zinc-100 placeholder:text-zinc-400 focus:outline-none ${
            validationError
              ? "border-rose-400/70 focus:border-rose-400"
              : "border-white/[0.08] focus:border-violet-400/60"
          }`}
        />

        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          {validationError ? (
            <p
              id="scanner-validation-error"
              role="alert"
              className="text-xs text-rose-300 flex items-center gap-1.5"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{validationError}</span>
            </p>
          ) : (
            <span className="text-[11px] text-zinc-400">
              Supports English, Hindi/Hinglish, and uploaded chat screenshots.
            </span>
          )}
          <span id="scanner-character-hint" className="text-[11px] font-mono text-zinc-400">
            {message.length}/{MAX_MESSAGE_LENGTH}
          </span>
        </div>
      </div>

      {imagePreview && (
        <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagePreview.dataUrl}
            alt={`Uploaded screenshot preview: ${imagePreview.name}`}
            className="w-12 h-12 rounded-xl object-cover border border-white/15"
          />
          <div className="text-xs pr-2">
            <p className="font-medium text-zinc-100 truncate max-w-[180px]">{imagePreview.name}</p>
            <p className="text-[11px] text-zinc-300">Ready for Vision analysis</p>
          </div>
          <button
            type="button"
            onClick={() => onImageChange(null)}
            className="glass-pill p-1.5 text-rose-300"
            aria-label="Remove uploaded screenshot"
          >
            <X className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-300">
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_IMAGE_MIME_TYPES.join(",")}
            aria-label="Upload scam screenshot"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="glass-pill inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-zinc-200"
          >
            <ImagePlus className="w-3.5 h-3.5 text-violet-300" aria-hidden="true" />
            Upload Screenshot
          </button>

          <button
            type="button"
            onClick={() => void handleLoadSampleScreenshot()}
            className="glass-pill inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-cyan-200"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" aria-hidden="true" />
            Try Sample Screenshot
          </button>

          <button
            type="button"
            onClick={onTestInjection}
            className="glass-pill inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-violet-200"
            title="Test PromptWars prompt-injection resilience"
          >
            <ShieldPlus className="w-3.5 h-3.5 text-violet-300" aria-hidden="true" />
            Test AI Override
          </button>

          <button
            type="button"
            onClick={onClear}
            disabled={!canClear}
            className="glass-pill inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 disabled:opacity-45"
            aria-label="Clear message and screenshot"
          >
            <RotateCcw className="w-3 h-3 text-zinc-300" aria-hidden="true" />
            Clear
          </button>

          <span className="glass-pill inline-flex items-center gap-1 px-3 py-1">
            <Link2 className="w-3 h-3 text-cyan-300" aria-hidden="true" /> {indicators.urls.length} link(s)
          </span>
          <span className="glass-pill inline-flex items-center gap-1 px-3 py-1">
            <MessageSquareWarning className="w-3 h-3 text-amber-300" aria-hidden="true" />{" "}
            {indicators.urgencyPhrases.length} urgency cue(s)
          </span>
        </div>

        <button
          type="button"
          disabled={isScanning}
          onClick={onScan}
          className="vibe-button-shimmer inline-flex items-center gap-2 px-6 py-2.5 text-sm disabled:opacity-60"
        >
          <SearchCheck className="w-4 h-4" aria-hidden="true" />
          {isScanning ? "Scanning..." : "Scan Message Now"}
        </button>
      </div>
    </section>
  );
}
