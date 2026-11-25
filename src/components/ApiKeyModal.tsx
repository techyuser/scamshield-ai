"use client";

import { useState } from "react";
import { KeyRound, ShieldCheck, X } from "lucide-react";

interface ApiKeyModalProps {
  onClose: () => void;
  sessionKey: string;
  onSaveKey: (key: string) => void;
  serverConfigured: boolean;
}

export function ApiKeyModal({
  onClose,
  sessionKey,
  onSaveKey,
  serverConfigured,
}: ApiKeyModalProps) {
  const [draft, setDraft] = useState(sessionKey);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Gemini settings"
    >
      <div
        className="w-full max-w-md vibe-card p-6 border border-white/15 bg-[#0e1019]/95 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-violet-300" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">AI Engine Settings</h2>
              <p className="text-xs text-zinc-400">Gemini 3.5 Flash Lite + Offline Fraud Guard</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/10"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3 text-xs text-zinc-300 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            {serverConfigured ? (
              <span>
                Server <code className="text-emerald-300">GEMINI_API_KEY</code> is active.
              </span>
            ) : (
              <span>
                Works out of the box using the built-in Fraud Pattern Detector. Optionally paste a Gemini API key below for live LLM analysis during this session.
              </span>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="gemini-session-key" className="text-xs font-medium text-zinc-300">
            Optional Gemini API Key (session memory only)
          </label>
          <input
            id="gemini-session-key"
            type="password"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="AIza..."
            className="w-full rounded-xl bg-black/40 border border-white/15 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-400"
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          {sessionKey && (
            <button
              type="button"
              onClick={() => {
                onSaveKey("");
                onClose();
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-rose-300 hover:bg-rose-500/10"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSaveKey(draft.trim());
              onClose();
            }}
            className="vibe-button-shimmer px-4 py-2 text-xs"
          >
            Save Key
          </button>
        </div>
      </div>
    </div>
  );
}
