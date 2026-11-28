"use client";

import {
  Home,
  Search,
  ShieldAlert,
  History,
  Settings,
} from "lucide-react";

export type MobileTabId = "home" | "scanner" | "notification-shield" | "history" | "settings";

interface BottomNavigationProps {
  activeTab: MobileTabId;
  onChange: (tab: MobileTabId) => void;
}

export const MOBILE_TABS = [
  { id: "home" as const, label: "Home", icon: Home },
  { id: "scanner" as const, label: "Scanner", icon: Search },
  { id: "notification-shield" as const, label: "Shield", icon: ShieldAlert },
  { id: "history" as const, label: "History", icon: History },
  { id: "settings" as const, label: "Settings", icon: Settings },
] as const;

export function BottomNavigation({ activeTab, onChange }: BottomNavigationProps) {
  const activeIndex = Math.max(0, MOBILE_TABS.findIndex((t) => t.id === activeTab));

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#080a12]/95 border-t border-slate-800/80 pb-[env(safe-area-inset-bottom)]"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="relative grid grid-cols-5 px-2 py-2 max-w-md mx-auto">
        {/* Sliding active pill */}
        <div
          aria-hidden="true"
          className="absolute top-2 bottom-2 left-2 w-[calc((100%-1rem)/5)] px-1 pointer-events-none transition-transform duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
          style={{ transform: `translate3d(${activeIndex * 100}%, 0, 0)` }}
        >
          <div className="w-full h-full rounded-2xl bg-purple-500/15 border border-purple-400/25" />
        </div>

        {MOBILE_TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={
                "relative z-10 flex flex-col items-center justify-center gap-1 py-2 rounded-2xl transition-colors duration-200 " +
                "touch-manipulation active:scale-95 transition-transform " +
                (isActive ? "text-purple-300" : "text-slate-500 hover:text-slate-300")
              }
              aria-current={isActive ? "page" : undefined}
              aria-label={label}
            >
              <Icon
                className={`w-5 h-5 transition-transform duration-200 ${isActive ? "scale-110" : "scale-100"}`}
                aria-hidden="true"
              />
              <span className="text-[11px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}