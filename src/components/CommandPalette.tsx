"use client";

import { useEffect, useMemo, useState } from "react";
import { Command, CornerDownLeft, Search, X } from "lucide-react";

export interface PaletteAction {
  id: string;
  label: string;
  hint: string;
  group: string;
  run: () => void;
}

interface CommandPaletteProps {
  onClose: () => void;
  actions: PaletteAction[];
}

export function CommandPalette({ onClose, actions }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.hint.toLowerCase().includes(q) ||
        a.group.toLowerCase().includes(q)
    );
  }, [actions, query]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (filtered.length ? (prev + 1) % filtered.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) =>
          filtered.length ? (prev - 1 + filtered.length) % filtered.length : 0
        );
      } else if (e.key === "Enter" && filtered[activeIndex]) {
        e.preventDefault();
        filtered[activeIndex].run();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filtered, activeIndex, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm pt-20 px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Quick actions"
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-white/15 bg-[#0e1019]/95 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10">
          <Search className="w-4 h-4 text-violet-400 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search demo scams or quick actions..."
            className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/10"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.map((action, idx) => {
            const isSelected = idx === activeIndex;
            return (
              <button
                key={action.id}
                type="button"
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => {
                  action.run();
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors ${
                  isSelected
                    ? "bg-violet-500/20 border border-violet-400/35 text-zinc-100"
                    : "border border-transparent text-zinc-300 hover:bg-white/5"
                }`}
              >
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-violet-300/80 font-semibold block">
                    {action.group}
                  </span>
                  <span className="text-sm font-medium">{action.label}</span>
                </div>
                <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                  {action.hint}
                  {isSelected && <CornerDownLeft className="w-3.5 h-3.5 text-violet-300" />}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t border-white/10 bg-white/[0.02] text-[11px] text-zinc-500">
          <span className="flex items-center gap-1">
            <Command className="w-3 h-3" /> Cmd+K
          </span>
          <span>↑↓ select · Enter run · Esc close</span>
        </div>
      </div>
    </div>
  );
}
