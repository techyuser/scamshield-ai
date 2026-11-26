"use client";

import { Command, Cpu, KeyRound, ShieldAlert, Volume2, VolumeX } from "lucide-react";

interface HeaderNavProps {
  engineName: string;
  liveGeminiReady: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenArchitecture: () => void;
  onOpenSettings: () => void;
  onOpenPalette: () => void;
}

/**
 * Floating glassmorphism navigation header with engine status, audio toggle, and Cmd+K trigger.
 */
export function HeaderNav({
  engineName,
  liveGeminiReady,
  soundEnabled,
  onToggleSound,
  onOpenArchitecture,
  onOpenSettings,
  onOpenPalette,
}: HeaderNavProps) {
  return (
    <div className="sticky top-3 z-30 px-4 sm:px-6 pt-1">
      <header
        aria-label="Primary navigation"
        className="max-w-5xl mx-auto h-14 px-4 rounded-full bg-white/[0.045] backdrop-blur-2xl border border-white/[0.11] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_16px_40px_-14px_rgba(0,0,0,0.75)] flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shadow-[0_0_18px_rgba(124,58,237,0.5)]"
            aria-hidden="true"
          >
            <ShieldAlert className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold tracking-tight text-white text-sm sm:text-base">
            ScamShield AI
          </span>
          <span className="hidden sm:inline-flex text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-200 border border-violet-400/30">
            PromptWars
          </span>
        </div>

        <nav aria-label="Workspace actions" className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenArchitecture}
            className="glass-pill hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-200"
          >
            <Cpu className="w-3.5 h-3.5 text-violet-300" aria-hidden="true" />
            AI Guard
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="glass-pill inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
            aria-label={`${engineName}: Configure AI engine settings`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                liveGeminiReady ? "bg-emerald-400 animate-pulse" : "bg-cyan-400"
              }`}
              aria-hidden="true"
            />
            <span className="hidden md:inline text-zinc-200">{engineName}</span>
            <KeyRound className="w-3 h-3 text-zinc-300" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onToggleSound}
            className="glass-pill p-2 text-zinc-200"
            aria-label={soundEnabled ? "Mute alert chimes" : "Enable alert chimes"}
            aria-pressed={soundEnabled}
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={onOpenPalette}
            className="glass-pill inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-200"
            title="Open quick command menu (Cmd+K)"
          >
            <Command className="w-3.5 h-3.5 text-violet-300" aria-hidden="true" />
            <span className="sr-only">Open quick command menu </span>
            <span className="hidden sm:inline">Cmd+K</span>
          </button>
        </nav>
      </header>
    </div>
  );
}
