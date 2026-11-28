"use client";

import { useCallback, useEffect, useState } from "react";
import { BottomNavigation, MOBILE_TABS, type MobileTabId } from "@/components/mobile/BottomNavigation";
import { HomeMobile } from "@/components/mobile/HomeMobile";
import { ScannerMobile } from "@/components/mobile/ScannerMobile";
import { NotificationShieldDashboard } from "@/components/mobile/NotificationShieldDashboard";
import { HistoryMobile } from "@/components/mobile/HistoryMobile";
import { SettingsMobile } from "@/components/mobile/SettingsMobile";

export default function MobileAppPage() {
  const [activeTab, setActiveTab] = useState<MobileTabId>("home");
  const [visitedTabs, setVisitedTabs] = useState<Set<MobileTabId>>(() => new Set(["home"]));
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  const handleSelectTab = useCallback(
    (nextTab: MobileTabId) => {
      if (nextTab === activeTab) return;
      const curIdx = MOBILE_TABS.findIndex((t) => t.id === activeTab);
      const nextIdx = MOBILE_TABS.findIndex((t) => t.id === nextTab);
      setDirection(nextIdx >= curIdx ? "forward" : "back");
      setVisitedTabs((prev) => {
        if (prev.has(nextTab)) return prev;
        const copy = new Set(prev);
        copy.add(nextTab);
        return copy;
      });
      setActiveTab(nextTab);
    },
    [activeTab]
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [activeTab]);

  const animClass = direction === "forward" ? "mobile-tab-enter-forward" : "mobile-tab-enter-back";

  return (
    <div className="mobile-app-shell min-h-screen bg-slate-950 text-slate-100 overflow-x-clip pt-[max(0.75rem,env(safe-area-inset-top))] pb-[calc(5.5rem+env(safe-area-inset-bottom))] selection:bg-purple-500/30">
      <main className="pt-2 pb-6">
        {visitedTabs.has("home") && (
          <div className={activeTab === "home" ? animClass : "hidden"}>
            <HomeMobile onNavigate={handleSelectTab} isActive={activeTab === "home"} />
          </div>
        )}
        {visitedTabs.has("scanner") && (
          <div className={activeTab === "scanner" ? animClass : "hidden"}>
            <ScannerMobile isActive={activeTab === "scanner"} />
          </div>
        )}
        {visitedTabs.has("notification-shield") && (
          <div className={activeTab === "notification-shield" ? animClass : "hidden"}>
            <NotificationShieldDashboard isActive={activeTab === "notification-shield"} />
          </div>
        )}
        {visitedTabs.has("history") && (
          <div className={activeTab === "history" ? animClass : "hidden"}>
            <HistoryMobile isActive={activeTab === "history"} />
          </div>
        )}
        {visitedTabs.has("settings") && (
          <div className={activeTab === "settings" ? animClass : "hidden"}>
            <SettingsMobile />
          </div>
        )}
      </main>
      <BottomNavigation activeTab={activeTab} onChange={handleSelectTab} />
    </div>
  );
}
