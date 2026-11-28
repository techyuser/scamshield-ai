"use client";

import { useState } from "react";
import { BottomNavigation } from "./BottomNavigation";
import { NotificationShieldDashboard } from "./NotificationShieldDashboard";
import { ScannerMobile } from "./ScannerMobile";
import { HistoryMobile } from "./HistoryMobile";
import { SettingsMobile } from "./SettingsMobile";
import { HomeMobile } from "./HomeMobile";

export function MobileLayout({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<"home" | "scanner" | "notification-shield" | "history" | "settings">("home");

  const renderTab = () => {
    switch (activeTab) {
      case "home":
        return <HomeMobile onNavigate={setActiveTab} isActive />;
      case "scanner":
        return <ScannerMobile />;
      case "notification-shield":
        return <NotificationShieldDashboard />;
      case "history":
        return <HistoryMobile />;
      case "settings":
        return <SettingsMobile />;
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-slate-950">
      <main className="pb-24">{renderTab()}</main>
      <BottomNavigation activeTab={activeTab} onChange={setActiveTab} />
    </div>
  );
}