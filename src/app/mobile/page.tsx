"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatedSplash } from "@/components/mobile/AnimatedSplash";
import { BottomNavigation, MOBILE_TABS, type MobileTabId } from "@/components/mobile/BottomNavigation";
import { HomeMobile } from "@/components/mobile/HomeMobile";
import { ScannerMobile, type PresetScanRequest } from "@/components/mobile/ScannerMobile";
import { NotificationShieldDashboard } from "@/components/mobile/NotificationShieldDashboard";
import { HistoryMobile } from "@/components/mobile/HistoryMobile";
import { SettingsMobile } from "@/components/mobile/SettingsMobile";
import { ThreatReportSheet, type ThreatReportData } from "@/components/mobile/ThreatReportSheet";
import { loadMobileSettings } from "@/lib/mobile-storage";
import { applyAppTheme } from "@/lib/theme";
import { ScamShieldBridge, type ScamAlert } from "@/plugins/scamshield-bridge";
import type { DemoCase } from "@/types/scamshield";

export default function MobileAppPage() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<MobileTabId>("home");
  const [visitedTabs, setVisitedTabs] = useState<Set<MobileTabId>>(() => new Set(["home"]));
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [presetRequest, setPresetRequest] = useState<PresetScanRequest | null>(null);
  const [activeReport, setActiveReport] = useState<ThreatReportData | null>(null);
  const reqCounterRef = useRef(0);

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

  const handleQuickDemoScan = useCallback((demo: DemoCase) => {
    reqCounterRef.current += 1;
    setPresetRequest({ id: reqCounterRef.current, demo });
    setVisitedTabs((prev) => {
      if (prev.has("scanner")) return prev;
      const copy = new Set(prev);
      copy.add("scanner");
      return copy;
    });
    setDirection("forward");
    setActiveTab("scanner");
  }, []);

  const openReportSheet = useCallback((report: ThreatReportData) => {
    setShowSplash(false);
    setActiveReport(report);
  }, []);

  useEffect(() => {
    const settings = loadMobileSettings();
    applyAppTheme(settings.theme);
    const mq = window.matchMedia?.("(prefers-color-scheme: light)");
    const onSystemChange = () => {
      const current = loadMobileSettings();
      if (current.theme === "system") applyAppTheme("system");
    };
    mq?.addEventListener?.("change", onSystemChange);
    return () => mq?.removeEventListener?.("change", onSystemChange);
  }, []);

  useEffect(() => {
    ScamShieldBridge.getShieldData()
      .then((data) => {
        if (data.pendingAlert) {
          openReportSheet({
            message: data.pendingAlert.preview,
            source: data.pendingAlert.packageName,
            riskScore: data.pendingAlert.riskScore,
            timestamp: data.pendingAlert.timestamp,
            category: data.pendingAlert.category,
          });
        }
      })
      .catch(() => {});

    let openListener: { remove: () => Promise<void> } | undefined;
    ScamShieldBridge.addListener("openScamAlert", (alert: ScamAlert) => {
      openReportSheet({
        message: alert.preview,
        source: alert.packageName,
        riskScore: alert.riskScore,
        timestamp: alert.timestamp,
        category: alert.category,
      });
    }).then((l) => {
      openListener = l;
    });

    return () => {
      openListener?.remove();
    };
  }, [openReportSheet]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [activeTab]);

  const animClass = direction === "forward" ? "mobile-tab-enter-forward" : "mobile-tab-enter-back";

  return (
    <div className="mobile-app-shell min-h-screen bg-slate-950 text-slate-100 overflow-x-clip pt-[max(0.75rem,env(safe-area-inset-top))] pb-[calc(5.5rem+env(safe-area-inset-bottom))] selection:bg-purple-500/30">
      {showSplash && <AnimatedSplash onDone={() => setShowSplash(false)} />}
      {activeReport && <ThreatReportSheet report={activeReport} onClose={() => setActiveReport(null)} />}

      <main className="pt-2 pb-6">
        {visitedTabs.has("home") && (
          <div className={activeTab === "home" ? animClass : "hidden"}>
            <HomeMobile
              onNavigate={handleSelectTab}
              onQuickScan={handleQuickDemoScan}
              isActive={activeTab === "home"}
            />
          </div>
        )}
        {visitedTabs.has("scanner") && (
          <div className={activeTab === "scanner" ? animClass : "hidden"}>
            <ScannerMobile isActive={activeTab === "scanner"} presetRequest={presetRequest} />
          </div>
        )}
        {visitedTabs.has("notification-shield") && (
          <div className={activeTab === "notification-shield" ? animClass : "hidden"}>
            <NotificationShieldDashboard
              isActive={activeTab === "notification-shield"}
              onInspectAlert={(alert) =>
                openReportSheet({
                  message: alert.preview,
                  source: alert.packageName,
                  riskScore: alert.riskScore,
                  timestamp: alert.timestamp,
                  category: alert.category,
                })
              }
            />
          </div>
        )}
        {visitedTabs.has("history") && (
          <div className={activeTab === "history" ? animClass : "hidden"}>
            <HistoryMobile
              isActive={activeTab === "history"}
              onInspectEntry={(entry) =>
                openReportSheet({
                  message: entry.preview,
                  source: entry.source,
                  riskScore: entry.riskScore,
                  timestamp: entry.timestamp,
                  category: entry.category,
                })
              }
            />
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
