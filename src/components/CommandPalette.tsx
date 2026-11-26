"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Command, CornerDownLeft, Search, X } from "lucide-react";
import { AccessibleDialog } from "./ui/AccessibleDialog";

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
  const inputRef = useRef<HTMLInputElement>(null);

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

  const safeActiveIndex = filtered.length === 0 ? -1 : Math.min(activeIndex, filtered.length - 1);
  const activeOption = safeActiveIndex >= 0 ? filtered[safeActiveIndex] : undefined;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (filtered.length ? (prev + 1) % filtered.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) =>
          filtered.length ? (prev - 1 + filtered.length) % filtered.length : 0
        );
      } else if (e.key === "Enter" && activeOption && document.activeElement === inputRef.current) {
        e.preventDefault();
        activeOption.run();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filtered.length, activeOption, onClose]);

  return (
    <AccessibleDialog
      open
      onClose={onClose}
      ariaLabel="Quick actions"
      alignmentClassName="items-start justify-center pt-20 px-4"
      panelClassName="w-full max-w-xl rounded-2xl border border-white/15 bg-[#0e1019]/95 shadow-2xl overflow-hidden"
      initialFocusRef={inputRef}
    >
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10">
        <Search className="w-4 h-4 text-violet-400 shrink-0" aria-hidden="true" />
        <label htmlFor="command-palette-search" className="sr-only">
          Search demo scams or quick actions
        </label>
        <input
          id="command-palette-search"
          ref={inputRef}
          role="combobox"
          aria-expanded={true}
          aria-controls="command-palette-listbox"
          aria-activedescendant={activeOption ? `palette-option-${activeOption.id}` : undefined}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          placeholder="Search demo scams or quick actions..."
          className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-zinc-300 hover:text-zinc-100 hover:bg-white/10"
          aria-label="Close"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      <div
        id="command-palette-listbox"
        role="listbox"
        aria-label="Available quick actions"
        className="max-h-80 overflow-y-auto p-2 space-y-1"
      >
        {filtered.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-zinc-300">
            No matching scenarios or actions found.
          </p>
        ) : (
          filtered.map((action, idx) => {
            const isSelected = idx === safeActiveIndex;
            return (
              <button
                key={action.id}
                id={`palette-option-${action.id}`}
                role="option"
                aria-selected={isSelected}
                type="button"
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => {
                  action.run();
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors ${
                  isSelected
                    ? "bg-violet-500/20 border border-violet-400/35 text-zinc-100"
                    : "border border-transparent text-zinc-200 hover:bg-white/5"
                }`}
              >
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-violet-300 font-semibold block">
                    {action.group}
                  </span>
                  <span className="text-sm font-medium">{action.label}</span>
                </div>
                <span className="flex items-center gap-1.5 text-xs text-zinc-300">
                  {action.hint}
                  {isSelected && <CornerDownLeft className="w-3.5 h-3.5 text-violet-300" aria-hidden="true" />}
                </span>
              </button>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-2 border-t border-white/10 bg-white/[0.02] text-[11px] text-zinc-400">
        <span className="flex items-center gap-1">
          <Command className="w-3 h-3" aria-hidden="true" /> Cmd+K
        </span>
        <span>↑↓ select · Enter run · Esc close</span>
      </div>
    </AccessibleDialog>
  );
}
